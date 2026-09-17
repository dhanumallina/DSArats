import type { ActivityType, ProblemStatus, UserProblem } from "@prisma/client";
import { PROBLEM_STATUS } from "@dsarats/shared";
import type {
  ActivityHeatmapResponse,
  Difficulty,
  ProblemProgressResponse,
  ProgressSummaryResponse,
  SheetProgressSummaryDto,
  TopicProgressSummaryDto,
  UserProblemProgressDto,
} from "@dsarats/shared";
import { prisma } from "../db";
import { ApiError } from "./auth.service";
import { recomputeStreaks, recordActivity } from "./activity.service";
import { evaluateAchievements } from "./gamification.service";
import { getStreakSummary, listActivityDays, localDateKey } from "./streak.service";
import { archiveRevisionSchedule, ensureRevisionSchedule } from "./revision.service";

/**
 * How each problem status is reported in the activity log.
 *
 * Only the types in STREAK_ACTIVITY_TYPES keep a streak day alive, so `ATTEMPTED`
 * (and a reset to `NOT_STARTED`) deliberately do not.
 *
 * Schedule ownership: this endpoint starts a cycle on SOLVED and archives it on
 * MASTERED, but it does NOT advance the interval for REVISED. Advancing is owned by
 * POST /revision/:problemId/complete, which also records the difficulty rating — so a
 * direct REVISED here records status/activity without moving the next due date. The
 * web app drives that transition through the revision endpoint.
 */
const STATUS_ACTIVITY: Record<ProblemStatus, ActivityType | null> = {
  NOT_STARTED: null,
  ATTEMPTED: "PROBLEM_ATTEMPTED",
  SOLVED: "PROBLEM_SOLVED",
  NEEDS_REVISION: "PROBLEM_ATTEMPTED",
  REVISED: "REVISION_COMPLETED",
  MASTERED: "REVISION_COMPLETED",
};

/** Post-solve states: a problem in one of these was solved even if `firstSolvedAt` is unset. */
const SOLVED_STATUSES = new Set<ProblemStatus>([
  "SOLVED",
  "NEEDS_REVISION",
  "REVISED",
  "MASTERED",
]);

interface ProblemProgressRow {
  status: ProblemStatus;
  firstSolvedAt: Date | null;
}

function isSolved(progress: ProblemProgressRow | undefined): boolean {
  return progress != null && (progress.firstSolvedAt != null || SOLVED_STATUSES.has(progress.status));
}

export function toProgressDto(progress: UserProblem): UserProblemProgressDto {
  return {
    problemId: progress.problemId,
    status: progress.status,
    firstSolvedAt: progress.firstSolvedAt?.toISOString() ?? null,
    lastActivityAt: progress.lastActivityAt?.toISOString() ?? null,
    solveCount: progress.solveCount,
  };
}

/**
 * Set a user's status on a problem.
 *
 * Status change, activity log, and streak upsert happen in one transaction so the
 * tracking loop can never partially apply (plan §5.12). Re-sending the current
 * status is a no-op, which makes the endpoint safe to retry.
 */
export async function setProblemStatus(
  userId: string,
  problemId: string,
  status: ProblemStatus,
): Promise<ProblemProgressResponse> {
  const [problem, user, existing] = await Promise.all([
    prisma.problem.findUnique({ where: { id: problemId }, select: { id: true } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { profile: { select: { timezone: true, longestStreak: true } } },
    }),
    prisma.userProblem.findUnique({ where: { userId_problemId: { userId, problemId } } }),
  ]);

  if (!problem) throw new ApiError(404, "NOT_FOUND", "Problem not found");
  if (!user) throw new ApiError(404, "NOT_FOUND", "User not found");

  const timezone = user.profile?.timezone || "UTC";
  const cachedLongest = user.profile?.longestStreak ?? 0;

  // Idempotent retry: the same status must not add activity or inflate solve counts.
  if (existing && existing.status === status) {
    return {
      progress: toProgressDto(existing),
      streak: await getStreakSummary(userId, timezone),
    };
  }

  const now = new Date();
  const activityType = STATUS_ACTIVITY[status];

  const { userProblem, streaks } = await prisma.$transaction(async (tx) => {
    const updated = await tx.userProblem.upsert({
      where: { userId_problemId: { userId, problemId } },
      create: {
        userId,
        problemId,
        status,
        firstSolvedAt: status === "SOLVED" ? now : null,
        lastActivityAt: status === "NOT_STARTED" ? null : now,
        solveCount: status === "SOLVED" ? 1 : 0,
      },
      update: {
        status,
        // undefined leaves the previous timestamp untouched (reset to NOT_STARTED).
        lastActivityAt: status === "NOT_STARTED" ? undefined : now,
        ...(status === "SOLVED" && !existing?.firstSolvedAt ? { firstSolvedAt: now } : {}),
        ...(status === "SOLVED" ? { solveCount: { increment: 1 } } : {}),
      },
    });

    if (activityType) {
      await recordActivity(tx, {
        userId,
        type: activityType,
        refId: problemId,
        metadata: { status },
        timezone,
        now,
      });
    }

    // Phase 5: solving starts a spaced-revision cycle; mastering archives it so the
    // revision history survives (plan §4.4).
    if (status === "SOLVED") {
      await ensureRevisionSchedule(tx, userId, problemId, now);
    } else if (status === "MASTERED") {
      await archiveRevisionSchedule(tx, userId, problemId, now);
    }

    const state = await recomputeStreaks(tx, userId, timezone, now);

    // A new record high must come from the run ending today, so the cached longest
    // only needs to grow when the recomputed longest exceeds it.
    if (state.longest > cachedLongest) {
      await tx.profile.update({ where: { userId }, data: { longestStreak: state.longest } });
    }

    return { userProblem: updated, streaks: state };
  });

  // Phase 6: run after the write commits. Achievements are then timestamped to the
  // activity that earned them, without adding work to the contended transaction.
  await evaluateAchievements(prisma, userId, now);

  return {
    progress: toProgressDto(userProblem),
    streak: {
      current: streaks.current,
      longest: Math.max(streaks.longest, cachedLongest),
      activeToday: streaks.activeToday,
      today: streaks.today,
      timezone,
    },
  };
}

/**
 * Aggregate the user's progress across the published catalog.
 *
 * "Solved" means a problem reached any post-solve state (or `firstSolvedAt` is set) and
 * counts distinct problems — re-solves never inflate it. Topics and sheets carry their
 * own catalog totals so the client can render coverage without a second request.
 */
export async function getProgressSummary(userId: string): Promise<ProgressSummaryResponse> {
  const [problems, userProblems, sheets] = await Promise.all([
    prisma.problem.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        difficulty: true,
        topic: { select: { slug: true, name: true, order: true } },
      },
    }),
    prisma.userProblem.findMany({
      where: { userId },
      select: { problemId: true, status: true, firstSolvedAt: true },
    }),
    prisma.dSASheet.findMany({
      where: { isPublished: true },
      orderBy: { order: "asc" },
      select: {
        slug: true,
        name: true,
        problems: { select: { problemId: true } },
        userProgress: {
          where: { userId },
          select: { status: true, topic: { select: { slug: true, name: true } } },
        },
      },
    }),
  ]);

  const publishedIds = new Set(problems.map((problem) => problem.id));
  const progressByProblem = new Map(userProblems.map((row) => [row.problemId, row]));

  const byStatus: Record<ProblemStatus, number> = {
    NOT_STARTED: 0,
    ATTEMPTED: 0,
    SOLVED: 0,
    NEEDS_REVISION: 0,
    REVISED: 0,
    MASTERED: 0,
  };
  const byDifficulty: Record<Difficulty, { total: number; solved: number }> = {
    EASY: { total: 0, solved: 0 },
    MEDIUM: { total: 0, solved: 0 },
    HARD: { total: 0, solved: 0 },
  };
  const topicRows = new Map<string, TopicProgressSummaryDto & { order: number }>();

  let solved = 0;
  let attempted = 0;

  for (const problem of problems) {
    byDifficulty[problem.difficulty].total += 1;

    let topicRow = topicRows.get(problem.topic.slug);
    if (!topicRow) {
      topicRow = {
        topic: { slug: problem.topic.slug, name: problem.topic.name },
        total: 0,
        solved: 0,
        attempted: 0,
        notStarted: 0,
        order: problem.topic.order,
      };
      topicRows.set(problem.topic.slug, topicRow);
    }
    topicRow.total += 1;

    const progress = progressByProblem.get(problem.id);
    if (progress) byStatus[progress.status] += 1;

    if (isSolved(progress)) {
      solved += 1;
      byDifficulty[problem.difficulty].solved += 1;
      topicRow.solved += 1;
    } else if (progress?.status === PROBLEM_STATUS.ATTEMPTED) {
      attempted += 1;
      topicRow.attempted += 1;
    } else {
      topicRow.notStarted += 1;
    }
  }

  const bySheet: SheetProgressSummaryDto[] = sheets.map((sheet) => {
    const progress = sheet.userProgress[0];
    const sheetProblems = sheet.problems.filter((problem) => publishedIds.has(problem.problemId));

    return {
      sheet: { slug: sheet.slug, name: sheet.name },
      total: sheetProblems.length,
      solved: sheetProblems.filter((problem) => isSolved(progressByProblem.get(problem.problemId)))
        .length,
      status: progress?.status ?? "NOT_STARTED",
      currentTopic: progress?.topic ?? null,
    };
  });

  return {
    totals: {
      publishedProblems: problems.length,
      solved,
      attempted,
      notStarted: problems.length - solved - attempted,
    },
    byStatus,
    byDifficulty,
    byTopic: [...topicRows.values()]
      .sort((a, b) => a.order - b.order || a.topic.name.localeCompare(b.topic.name))
      .map(({ order: _order, ...row }) => row),
    bySheet,
  };
}

/** Per-day activity for a calendar year, for the progress heatmap. */
export async function getActivityHeatmap(
  userId: string,
  timezone: string,
  year?: number,
): Promise<ActivityHeatmapResponse> {
  const targetYear = year ?? Number(localDateKey(new Date(), timezone).slice(0, 4));
  const days = await listActivityDays(userId, `${targetYear}-01-01`, `${targetYear}-12-31`);

  return {
    year: targetYear,
    timezone,
    days,
    activeDays: days.length,
    totalSolved: days.reduce((sum, day) => sum + day.problemsSolved, 0),
    maxCount: days.reduce((max, day) => Math.max(max, day.count), 0),
  };
}
