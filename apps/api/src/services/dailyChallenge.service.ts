import type { DailyChallengeStatus, Prisma } from "@prisma/client";
import type {
  DailyChallengeCompleteResponse,
  DailyChallengeCompletionDto,
  DailyChallengeDto,
  DailyChallengeHistoryQuery,
  DailyChallengeHistoryResponse,
  DailyChallengeResponse,
  Difficulty,
  StreakSummaryDto,
} from "@dsarats/shared";
import { prisma } from "../db";
import { ApiError } from "./auth.service";
import { recomputeStreaks, recordActivity } from "./activity.service";
import { evaluateAchievements } from "./gamification.service";
import { dateKeyToUtcDate, getStreakSummary, localDateKey, utcDateToKey } from "./streak.service";
import { decodeCursor, encodeCursor } from "../utils/pagination";

/** How the day's problem is chosen. `recommended` is personalized; `random` is not. */
export type ChallengeStrategy = "recommended" | "random";

export interface DailyChallengeOptions {
  strategy?: ChallengeStrategy;
  /** Restrict to a topic slug. */
  topic?: string;
  /** Restrict to one difficulty. */
  difficulty?: Difficulty;
}

const DEFAULT_OPTIONS: Required<Pick<DailyChallengeOptions, "strategy">> = {
  strategy: "recommended",
};

const challengeProblemSelect = {
  id: true,
  slug: true,
  title: true,
  difficulty: true,
  pattern: true,
  platform: true,
  platformProblemUrl: true,
  solutionUrl: true,
  estimatedMinutes: true,
  topic: { select: { slug: true, name: true } },
} as const;

type ChallengeWithProblem = Prisma.DailyChallengeGetPayload<{
  include: { problem: { select: typeof challengeProblemSelect } };
}>;

function toChallengeDto(challenge: ChallengeWithProblem): DailyChallengeDto {
  return {
    id: challenge.id,
    date: utcDateToKey(challenge.date),
    reason: challenge.reason,
    problem: challenge.problem,
  };
}

function toCompletionDto(completion: {
  status: DailyChallengeStatus;
  completedAt: Date;
}): DailyChallengeCompletionDto {
  return { status: completion.status, completedAt: completion.completedAt.toISOString() };
}

/**
 * Stable 32-bit hash (FNV-1a) used to pick deterministically within a candidate pool.
 *
 * The pick must be stable for a given (user, day, strategy, filters) so that two
 * requests racing to create the same day's challenge resolve to the same problem.
 */
function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Choose a problem for the user's day and explain — truthfully — why.
 *
 * Priority for the recommended strategy:
 *   1. A brand-new learner gets a foundational pick so the first solve is achievable.
 *   2. Problems the user flagged NEEDS_REVISION (the closest thing to "revision history"
 *      available before the Phase 5 scheduler).
 *   3. The least-covered topic with unfinished problems.
 *   4. If everything matching is already done, one to revisit.
 *
 * Returns null only when the published catalog is empty and no filter was applied;
 * a filter that matches nothing is a 404, not an empty challenge.
 */
async function selectChallengeProblem(
  userId: string,
  dateKey: string,
  options: DailyChallengeOptions,
): Promise<{ problemId: string; reason: string } | null> {
  const problems = await prisma.problem.findMany({
    where: {
      isPublished: true,
      ...(options.topic ? { topic: { slug: options.topic } } : {}),
      ...(options.difficulty ? { difficulty: options.difficulty } : {}),
    },
    select: {
      id: true,
      difficulty: true,
      topic: { select: { slug: true, name: true } },
    },
  });

  if (problems.length === 0) {
    if (options.topic || options.difficulty) {
      throw new ApiError(404, "NOT_FOUND", "No problems match that filter");
    }
    return null;
  }

  const [progress, totalProgress] = await Promise.all([
    prisma.userProblem.findMany({
      where: { userId, problemId: { in: problems.map((problem) => problem.id) } },
      select: { problemId: true, status: true },
    }),
    // Counted across the whole catalog, not just the filtered candidates: a user with
    // history who filters to an untouched topic is not a beginner.
    prisma.userProblem.count({ where: { userId } }),
  ]);
  const statusById = new Map(progress.map((row) => [row.problemId, row.status]));

  const seed = `${userId}:${dateKey}:${options.strategy}:${options.topic ?? ""}:${options.difficulty ?? ""}`;
  const pick = <T>(pool: T[]): T => pool[hashSeed(seed) % pool.length]!;

  // "Done" for recommendation purposes excludes NEEDS_REVISION — those are the ones
  // worth surfacing, not hiding.
  const isDone = (problemId: string): boolean => {
    const status = statusById.get(problemId);
    return status === "SOLVED" || status === "REVISED" || status === "MASTERED";
  };

  const needsRevision = problems.filter((problem) => statusById.get(problem.id) === "NEEDS_REVISION");
  const open = problems.filter(
    (problem) => !isDone(problem.id) && statusById.get(problem.id) !== "NEEDS_REVISION",
  );

  if (options.strategy === "random") {
    const pool = open.length > 0 ? open : problems;
    return { problemId: pick(pool).id, reason: "A random pick from the published catalog." };
  }

  if (totalProgress === 0) {
    const easy = problems.filter((problem) => problem.difficulty === "EASY");
    const pool = easy.length > 0 ? easy : problems;
    return {
      problemId: pick(pool).id,
      reason: "A foundational pick to get your first solve on the board.",
    };
  }

  if (needsRevision.length > 0) {
    return {
      problemId: pick(needsRevision).id,
      reason: "Picked from the problems you flagged for revision.",
    };
  }

  if (open.length > 0) {
    // Coverage is measured across the (optionally filtered) catalog so the ratio the
    // user sees in the reason matches what the challenge was chosen from.
    const coverage = new Map<string, { name: string; total: number; solved: number }>();
    for (const problem of problems) {
      const row =
        coverage.get(problem.topic.slug) ??
        { name: problem.topic.name, total: 0, solved: 0 };
      row.total += 1;
      if (isDone(problem.id)) row.solved += 1;
      coverage.set(problem.topic.slug, row);
    }

    const openTopics = [...new Set(open.map((problem) => problem.topic.slug))];
    const weakest = openTopics.reduce((best, slug) => {
      const candidate = coverage.get(slug)!;
      const current = coverage.get(best)!;
      const candidateRatio = candidate.solved / candidate.total;
      const currentRatio = current.solved / current.total;
      if (candidateRatio !== currentRatio) return candidateRatio < currentRatio ? slug : best;
      if (candidate.total !== current.total) return candidate.total > current.total ? slug : best;
      return slug.localeCompare(best) < 0 ? slug : best;
    });

    const covered = coverage.get(weakest)!;
    return {
      problemId: pick(open.filter((problem) => problem.topic.slug === weakest)).id,
      reason: `Picked because ${covered.name} is your least-covered topic (${covered.solved}/${covered.total} solved).`,
    };
  }

  return {
    problemId: pick(problems).id,
    reason: "You've covered every matching problem — here's one to revisit.",
  };
}

/**
 * Fetch the user's challenge for a date, creating it on first request.
 *
 * Creation is idempotent per (user, local date): the upsert makes a concurrent
 * request a no-op, so two callers always resolve to the same challenge. Options only
 * steer creation — once the day's challenge exists it stays stable.
 */
async function getOrCreateChallenge(
  userId: string,
  dateKey: string,
  options: DailyChallengeOptions,
): Promise<ChallengeWithProblem | null> {
  const date = dateKeyToUtcDate(dateKey);

  const existing = await prisma.dailyChallenge.findUnique({
    where: { userId_date: { userId, date } },
    include: { problem: { select: challengeProblemSelect } },
  });
  if (existing) return existing;

  const selection = await selectChallengeProblem(userId, dateKey, options);
  if (!selection) return null;

  return prisma.dailyChallenge.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, problemId: selection.problemId, reason: selection.reason },
    update: {},
    include: { problem: { select: challengeProblemSelect } },
  });
}

async function loadUserContext(userId: string): Promise<{ timezone: string; cachedLongest: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profile: { select: { timezone: true, longestStreak: true } } },
  });
  if (!user) throw new ApiError(404, "NOT_FOUND", "User not found");

  return {
    timezone: user.profile?.timezone || "UTC",
    cachedLongest: user.profile?.longestStreak ?? 0,
  };
}

/** Today's challenge (in the user's timezone) plus their own completion, if any. */
export async function getTodayChallenge(
  userId: string,
  options: DailyChallengeOptions = DEFAULT_OPTIONS,
): Promise<DailyChallengeResponse> {
  const { timezone } = await loadUserContext(userId);
  const challenge = await getOrCreateChallenge(userId, localDateKey(new Date(), timezone), options);
  if (!challenge) return { challenge: null, completion: null };

  const completion = await prisma.dailyChallengeCompletion.findUnique({
    where: { userId_challengeId: { userId, challengeId: challenge.id } },
  });

  return {
    challenge: toChallengeDto(challenge),
    completion: completion ? toCompletionDto(completion) : null,
  };
}

/**
 * Mark today's challenge.
 *
 * SOLVED and ATTEMPTED are deliberate engagement and keep the streak alive; SKIPPED
 * is recorded but is not meaningful activity, so it neither logs nor counts (plan §4.3).
 */
export async function completeChallenge(
  userId: string,
  status: DailyChallengeStatus,
): Promise<DailyChallengeCompleteResponse> {
  const { timezone, cachedLongest } = await loadUserContext(userId);
  const now = new Date();

  const challenge = await getOrCreateChallenge(
    userId,
    localDateKey(now, timezone),
    DEFAULT_OPTIONS,
  );
  if (!challenge) throw new ApiError(404, "NOT_FOUND", "No daily challenge is available yet");

  const existing = await prisma.dailyChallengeCompletion.findUnique({
    where: { userId_challengeId: { userId, challengeId: challenge.id } },
  });

  // Idempotent retry: same status must not re-log activity or move the timestamp.
  if (existing && existing.status === status) {
    return {
      challenge: toChallengeDto(challenge),
      completion: toCompletionDto(existing),
      streak: await getStreakSummary(userId, timezone, now),
    };
  }

  const { completion, streaks } = await prisma.$transaction(async (tx) => {
    const saved = await tx.dailyChallengeCompletion.upsert({
      where: { userId_challengeId: { userId, challengeId: challenge.id } },
      create: { userId, challengeId: challenge.id, status, completedAt: now },
      update: { status, completedAt: now },
    });

    if (status !== "SKIPPED") {
      await recordActivity(tx, {
        userId,
        type: "DAILY_CHALLENGE",
        refId: challenge.id,
        metadata: { status },
        timezone,
        now,
        // A challenge marked SOLVED is a solved problem, so it must count toward the
        // day's/weekly solved totals — not just keep the streak alive.
        countsAsSolved: status === "SOLVED",
      });
    }

    const state = await recomputeStreaks(tx, userId, timezone, now);
    if (state.longest > cachedLongest) {
      await tx.profile.update({ where: { userId }, data: { longestStreak: state.longest } });
    }

    return { completion: saved, streaks: state };
  });

  // Phase 6: completed after the commit, so unlocking never lengthens the transaction.
  await evaluateAchievements(prisma, userId, now);

  const streak: StreakSummaryDto = {
    current: streaks.current,
    longest: Math.max(streaks.longest, cachedLongest),
    activeToday: streaks.activeToday,
    today: streaks.today,
    timezone,
  };

  return { challenge: toChallengeDto(challenge), completion: toCompletionDto(completion), streak };
}

/** Past challenges the user has marked, newest first, cursor-paginated. */
export async function getChallengeHistory(
  userId: string,
  query: DailyChallengeHistoryQuery,
): Promise<DailyChallengeHistoryResponse> {
  const { cursor, limit } = query;

  const where: Prisma.DailyChallengeCompletionWhereInput = { userId };
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (!decoded) throw new ApiError(400, "VALIDATION_FAILED", "Invalid cursor", "cursor");
    where.OR = [
      { completedAt: { lt: new Date(decoded.createdAt) } },
      { completedAt: new Date(decoded.createdAt), id: { lt: decoded.id } },
    ];
  }

  const rows = await prisma.dailyChallengeCompletion.findMany({
    where,
    orderBy: [{ completedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    include: { challenge: { include: { problem: { select: challengeProblemSelect } } } },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page.at(-1);

  return {
    items: page.map((row) => ({
      challenge: toChallengeDto(row.challenge),
      completion: toCompletionDto(row),
    })),
    nextCursor:
      hasMore && last
        ? encodeCursor({ createdAt: last.completedAt.toISOString(), id: last.id })
        : null,
  };
}
