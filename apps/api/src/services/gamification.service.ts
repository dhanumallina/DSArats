import type { Achievement, Prisma } from "@prisma/client";
import {
  ACHIEVEMENTS,
  levelForXp,
  XP_PER_LEVEL,
  XP_RULES,
  XP_SOURCE_LABEL,
} from "@dsarats/shared";
import type {
  AchievementDto,
  AchievementMetric,
  AchievementsResponse,
  XpSourceDto,
  XpSourceKey,
  XpSummaryDto,
} from "@dsarats/shared";
import { prisma } from "../db";
import { longestStreak, utcDateToKey } from "./streak.service";

/**
 * Post-solve states, and the "is this problem solved?" test.
 *
 * Deliberately the same definition progress.service uses (including keeping a solve in
 * the count after the user resets a problem, which only clears the status): if the two
 * ever diverge, the analytics page and the dashboard report different totals for the
 * same activity.
 */
const SOLVED_STATUSES = ["SOLVED", "NEEDS_REVISION", "REVISED", "MASTERED"] as const;

function isSolvedRow(row: { status: string; firstSolvedAt: Date | null }): boolean {
  return row.firstSolvedAt !== null || (SOLVED_STATUSES as readonly string[]).includes(row.status);
}

/** The client `prisma` and a transaction client share every method used here. */
type Db = Prisma.TransactionClient;

/** Every metric an achievement can be measured against, for one user. */
export type AchievementMetrics = Record<AchievementMetric, number>;

/**
 * Fold the user's rows into every achievement metric in one pass.
 *
 * This is the single source of truth for "what has this user actually done": XP, the
 * readiness estimate, and achievement progress are all derived from this one result, so
 * no two screens can report the same fact differently.
 *
 * `LONGEST_STREAK` is recomputed from the streak records rather than read from the cached
 * profile value, so it is correct even when read inside the transaction that wrote them.
 */
export async function computeAchievementMetrics(
  db: Db,
  userId: string,
): Promise<AchievementMetrics> {
  const [rows, mastered, reviews, challenges, streakRows, sheetsCompleted] = await Promise.all([
    // No status filter: a reset problem keeps its solve history, so filtering it out here
    // would under-count against progress.service.
    db.userProblem.findMany({
      where: { userId },
      select: {
        status: true,
        firstSolvedAt: true,
        problem: { select: { difficulty: true, topicId: true } },
      },
    }),
    db.userProblem.count({ where: { userId, status: "MASTERED" } }),
    db.revisionSchedule.aggregate({ where: { userId }, _sum: { timesReviewed: true } }),
    db.dailyChallengeCompletion.count({ where: { userId, status: "SOLVED" } }),
    db.streakRecord.findMany({ where: { userId }, select: { activeDate: true } }),
    db.userSheetProgress.count({ where: { userId, status: "COMPLETED" } }),
  ]);

  const solved = rows.filter(isSolvedRow);
  // Breadth is about problems the user engaged with, so a reset does drop back out.
  const engaged = rows.filter((row) => row.status !== "NOT_STARTED");

  return {
    SOLVED: solved.length,
    HARD_SOLVED: solved.filter((row) => row.problem.difficulty === "HARD").length,
    MASTERED: mastered,
    REVISIONS: reviews._sum.timesReviewed ?? 0,
    DAILY_CHALLENGES: challenges,
    LONGEST_STREAK: longestStreak(streakRows.map((row) => utcDateToKey(row.activeDate))),
    TOPICS_ENGAGED: new Set(engaged.map((row) => row.problem.topicId)).size,
    SHEETS_COMPLETED: sheetsCompleted,
  };
}

// ── Catalogue ────────────────────────────────────────────────────────────────

let catalogCache: Achievement[] | null = null;

function catalogFields(definition: (typeof ACHIEVEMENTS)[number]) {
  return {
    name: definition.name,
    description: definition.description,
    iconKey: definition.iconKey,
    metric: definition.metric,
    threshold: definition.threshold,
    order: definition.order,
  };
}

/**
 * Sync the shared achievement definitions into the catalogue table.
 *
 * Diff-based, like the content seed: an in-sync catalogue is a no-op. Runs lazily on
 * first use so a fresh deployment does not depend on someone remembering to seed.
 */
export async function syncAchievementCatalog(db: Db = prisma): Promise<number> {
  const existing = await db.achievement.findMany();
  const byKey = new Map(existing.map((row) => [row.key, row]));
  let writes = 0;

  // Insert the missing rows in one statement with `skipDuplicates`: two requests can
  // legitimately sync at the same time (e.g. the first activity of a fresh deployment),
  // and a plain `create` would blow up one of their transactions on the unique key.
  const missing = ACHIEVEMENTS.filter((definition) => !byKey.has(definition.key));
  if (missing.length > 0) {
    const created = await db.achievement.createMany({
      data: missing.map((definition) => ({ key: definition.key, ...catalogFields(definition) })),
      skipDuplicates: true,
    });
    writes += created.count;
  }

  for (const definition of ACHIEVEMENTS) {
    const current = byKey.get(definition.key);
    if (!current) continue;

    const fields = catalogFields(definition);
    const changed =
      current.name !== fields.name ||
      current.description !== fields.description ||
      current.iconKey !== fields.iconKey ||
      current.metric !== fields.metric ||
      current.threshold !== fields.threshold ||
      current.order !== fields.order;

    if (changed) {
      await db.achievement.update({ where: { id: current.id }, data: fields });
      writes += 1;
    }
  }

  return writes;
}

async function loadCatalog(db: Db): Promise<Achievement[]> {
  if (catalogCache && catalogCache.length === ACHIEVEMENTS.length) return catalogCache;

  const rows = await db.achievement.findMany({ orderBy: { order: "asc" } });
  if (rows.length === ACHIEVEMENTS.length) {
    catalogCache = rows;
    return rows;
  }

  await syncAchievementCatalog(db);
  catalogCache = await db.achievement.findMany({ orderBy: { order: "asc" } });
  return catalogCache;
}

/** Unlock times by achievement id, for the rows the user already has. */
function loadUnlocked(db: Db, userId: string): Promise<Map<string, Date>> {
  return db.userAchievement
    .findMany({ where: { userId }, select: { achievementId: true, unlockedAt: true } })
    .then((rows) => new Map(rows.map((row) => [row.achievementId, row.unlockedAt])));
}

/**
 * Insert unlocks for the qualifying achievements the user does not have yet, and return
 * the unlock times now on record (a concurrent writer may have won the race, in which
 * case its earlier timestamp is the honest one).
 */
async function unlockQualifying(
  db: Db,
  userId: string,
  earned: Achievement[],
  now: Date,
): Promise<Map<string, Date>> {
  if (earned.length === 0) return new Map();

  await db.userAchievement.createMany({
    data: earned.map((row) => ({ userId, achievementId: row.id, unlockedAt: now })),
    skipDuplicates: true,
  });

  const ids = earned.map((row) => row.id);
  const stored = await db.userAchievement.findMany({
    where: { userId, achievementId: { in: ids } },
    select: { achievementId: true, unlockedAt: true },
  });
  return new Map(stored.map((row) => [row.achievementId, row.unlockedAt]));
}

// ── Unlocking ────────────────────────────────────────────────────────────────

/**
 * Unlock every achievement the user now qualifies for, and return the new keys.
 *
 * Called from the activity write path, after the write commits, so `unlockedAt` is the
 * moment the work happened rather than the next time the user opens a page.
 *
 * Bails out before computing metrics when nothing is left to earn — the common case for
 * an established user — so this stays cheap on the activity path.
 */
export async function evaluateAchievements(
  tx: Db,
  userId: string,
  now: Date = new Date(),
): Promise<string[]> {
  const catalog = await loadCatalog(tx);
  if (catalog.length === 0) return [];

  const unlockedAtById = await loadUnlocked(tx, userId);
  const pending = catalog.filter((row) => !unlockedAtById.has(row.id));
  if (pending.length === 0) return [];

  const metrics = await computeAchievementMetrics(tx, userId);
  const earned = pending.filter((row) => metrics[row.metric] >= row.threshold);
  if (earned.length === 0) return [];

  await unlockQualifying(tx, userId, earned, now);
  return earned.map((row) => row.key);
}

// ── Reads ────────────────────────────────────────────────────────────────────

function buildXpSummary(counts: Record<XpSourceKey, number>): XpSummaryDto {
  const sources: XpSourceDto[] = (Object.keys(XP_RULES) as XpSourceKey[]).map((key) => ({
    key,
    label: XP_SOURCE_LABEL[key],
    count: counts[key],
    pointsEach: XP_RULES[key],
    points: counts[key] * XP_RULES[key],
  }));

  const total = sources.reduce((sum, source) => sum + source.points, 0);
  const level = levelForXp(total);
  const pointsIntoLevel = total - (level - 1) * XP_PER_LEVEL;

  return {
    total,
    level,
    pointsIntoLevel,
    pointsToNextLevel: XP_PER_LEVEL - pointsIntoLevel,
    nextLevelAt: level * XP_PER_LEVEL,
    sources,
  };
}

/**
 * XP from metrics that were already computed.
 *
 * The four XP sources are four of the achievement metrics, so deriving XP this way keeps
 * the two in step by construction and spares the analytics page a second read of the
 * user's problems.
 */
export function xpSummaryFromMetrics(metrics: AchievementMetrics): XpSummaryDto {
  return buildXpSummary({
    PROBLEM_SOLVED: metrics.SOLVED,
    PROBLEM_MASTERED: metrics.MASTERED,
    REVISION_COMPLETED: metrics.REVISIONS,
    DAILY_CHALLENGE: metrics.DAILY_CHALLENGES,
  });
}

/** XP plus the breakdown it came from, so the number is always explainable. */
export async function getXpSummary(userId: string): Promise<XpSummaryDto> {
  return xpSummaryFromMetrics(await computeAchievementMetrics(prisma, userId));
}

/** The full catalogue with this user's progress and unlock state. */
export async function getAchievements(userId: string): Promise<AchievementsResponse> {
  const catalog = await loadCatalog(prisma);
  const unlockedAtById = await loadUnlocked(prisma, userId);

  // Catch-up pass: someone who met a threshold before the catalogue existed (or through
  // a path added later) still gets the achievement instead of silently losing it.
  const pending = catalog.filter((row) => !unlockedAtById.has(row.id));
  let metrics: AchievementMetrics | null = null;

  if (pending.length > 0) {
    metrics = await computeAchievementMetrics(prisma, userId);
    const earned = pending.filter((row) => metrics![row.metric] >= row.threshold);
    for (const [id, unlockedAt] of await unlockQualifying(prisma, userId, earned, new Date())) {
      unlockedAtById.set(id, unlockedAt);
    }
  }
  // With nothing locked, no metrics are needed: unlocked rows report their threshold.

  const achievements: AchievementDto[] = catalog.map((row) => {
    const unlockedAt = unlockedAtById.get(row.id) ?? null;
    return {
      key: row.key,
      name: row.name,
      description: row.description,
      iconKey: row.iconKey,
      metric: row.metric,
      threshold: row.threshold,
      order: row.order,
      progress: unlockedAt ? row.threshold : Math.min(metrics?.[row.metric] ?? 0, row.threshold),
      unlocked: unlockedAt !== null,
      unlockedAt: unlockedAt?.toISOString() ?? null,
    };
  });

  return {
    achievements,
    unlockedCount: achievements.filter((achievement) => achievement.unlocked).length,
    totalCount: achievements.length,
  };
}
