import type { Prisma, RevisionDifficulty } from "@prisma/client";
import { REVISION_INTERVALS_DAYS, REVISION_MAX_STAGE } from "@dsarats/shared";
import type {
  RevisionCompleteResponse,
  RevisionHistoryQuery,
  RevisionHistoryResponse,
  RevisionItemDto,
  RevisionQueueResponse,
  StreakSummaryDto,
} from "@dsarats/shared";
import { prisma } from "../db";
import { ApiError } from "./auth.service";
import { recomputeStreaks, recordActivity } from "./activity.service";
import { evaluateAchievements } from "./gamification.service";
import { dateKeyToUtcDate, getUserTimezone, localDateKey } from "./streak.service";
import { decodeCursor, encodeCursor } from "../utils/pagination";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Display cap for the queue — `dueCount` still reports the true total. */
const QUEUE_LIMIT = 50;

/** Aggregate revision numbers used by analytics and the readiness estimate. */
export interface RevisionCounts {
  totalReviews: number;
  reviewsLast30Days: number;
  activeSchedules: number;
  mastered: number;
  dueNow: number;
  overdue: number;
}

const revisionProblemSelect = {
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

type ScheduleWithProblem = Prisma.RevisionScheduleGetPayload<{
  include: { problem: { select: typeof revisionProblemSelect } };
}>;

/** Whole days past due; 0 for anything due today or later. */
export function daysOverdue(dueAt: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - dueAt.getTime()) / DAY_MS));
}

/** The due instant for a stage: `now + REVISION_INTERVALS_DAYS[stage]`. */
function dueAtForStage(now: Date, stage: number): Date {
  return new Date(now.getTime() + REVISION_INTERVALS_DAYS[stage]! * DAY_MS);
}

function toRevisionItemDto(
  schedule: ScheduleWithProblem,
  now: Date,
  difficultyAfterRevision: RevisionDifficulty | null,
): RevisionItemDto {
  return {
    problemId: schedule.problemId,
    problem: schedule.problem,
    stage: schedule.stage,
    dueAt: schedule.dueAt.toISOString(),
    lastReviewedAt: schedule.lastReviewedAt?.toISOString() ?? null,
    timesReviewed: schedule.timesReviewed,
    daysOverdue: daysOverdue(schedule.dueAt, now),
    difficultyAfterRevision,
  };
}

/**
 * Start (or keep) a revision schedule when a problem is solved.
 *
 * An active schedule is left untouched, so re-solving never resets the user's progress
 * through the intervals. A mastered (archived) problem starts a fresh cycle instead of
 * being resurrected as an overdue review.
 */
export async function ensureRevisionSchedule(
  tx: Prisma.TransactionClient,
  userId: string,
  problemId: string,
  now: Date = new Date(),
): Promise<void> {
  // Reopen a mastered row in place. Matching on `archivedAt: { not: null }` means this
  // is a no-op for an active schedule, so a re-solve never resets progress.
  const reopened = await tx.revisionSchedule.updateMany({
    where: { userId, problemId, archivedAt: { not: null } },
    data: { stage: 0, dueAt: dueAtForStage(now, 0), archivedAt: null },
  });
  if (reopened.count > 0) return;

  // Create-or-keep via upsert rather than find-then-create: two concurrent solves must
  // not both try to INSERT and trip the (userId, problemId) unique constraint.
  await tx.revisionSchedule.upsert({
    where: { userId_problemId: { userId, problemId } },
    create: { userId, problemId, stage: 0, dueAt: dueAtForStage(now, 0) },
    update: {},
  });
}

/**
 * Mastering a problem ends its revision cycle (plan §4.4).
 *
 * The row is archived rather than deleted so the user's revision history survives —
 * deleting it would silently erase every review they had done for that problem.
 */
export async function archiveRevisionSchedule(
  tx: Prisma.TransactionClient,
  userId: string,
  problemId: string,
  now: Date = new Date(),
): Promise<void> {
  await tx.revisionSchedule.updateMany({
    where: { userId, problemId, archivedAt: null },
    data: { archivedAt: now },
  });
}

/**
 * The user's revision queue.
 *
 * `due: true` returns only what is due now (most overdue first); `due: false` returns
 * the whole schedule so the client can show what is coming up.
 */
export async function getRevisionQueue(
  userId: string,
  { due }: { due: boolean },
): Promise<RevisionQueueResponse> {
  const now = new Date();

  // Actionable lists only: mastered (archived) problems are done, and an unpublished
  // problem can no longer be opened, so surfacing it would be a dead link.
  const activeWhere = { userId, archivedAt: null, problem: { isPublished: true } } as const;

  const [rows, dueCount, scheduledCount, timezone] = await Promise.all([
    prisma.revisionSchedule.findMany({
      where: { ...activeWhere, ...(due ? { dueAt: { lte: now } } : {}) },
      orderBy: [{ dueAt: "asc" }, { id: "asc" }],
      take: QUEUE_LIMIT,
      include: { problem: { select: revisionProblemSelect } },
    }),
    prisma.revisionSchedule.count({ where: { ...activeWhere, dueAt: { lte: now } } }),
    prisma.revisionSchedule.count({ where: activeWhere }),
    getUserTimezone(userId),
  ]);

  const ratings = await loadRatings(
    userId,
    rows.map((row) => row.problemId),
  );

  return {
    items: rows.map((row) => toRevisionItemDto(row, now, ratings.get(row.problemId) ?? null)),
    dueCount,
    scheduledCount,
    timezone,
  };
}

async function loadRatings(
  userId: string,
  problemIds: string[],
): Promise<Map<string, RevisionDifficulty | null>> {
  if (problemIds.length === 0) return new Map();

  const rows = await prisma.userProblem.findMany({
    where: { userId, problemId: { in: problemIds } },
    select: { problemId: true, difficultyAfterRevision: true },
  });
  return new Map(rows.map((row) => [row.problemId, row.difficultyAfterRevision]));
}

/**
 * Complete one revision: advance the stage, push `dueAt` out, mark the problem REVISED,
 * and log meaningful activity so the streak stays honest (plan §4.4).
 *
 * The stage caps at the final interval, so a 30-day cycle simply repeats until the
 * user masters the problem.
 *
 * If the problem was flagged NEEDS_REVISION, the cycle restarts instead of advancing
 * (plan §4.4): struggling means tomorrow's review is worth more than skipping ahead.
 */
export async function completeRevision(
  userId: string,
  problemId: string,
  difficultyAfterRevision?: RevisionDifficulty,
): Promise<RevisionCompleteResponse> {
  const [schedule, user, existingProgress] = await Promise.all([
    prisma.revisionSchedule.findUnique({
      where: { userId_problemId: { userId, problemId } },
      include: { problem: { select: revisionProblemSelect } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { profile: { select: { timezone: true, longestStreak: true } } },
    }),
    prisma.userProblem.findUnique({
      where: { userId_problemId: { userId, problemId } },
      select: { status: true },
    }),
  ]);

  // An archived (mastered) problem is no longer in the active queue.
  if (!schedule || schedule.archivedAt) {
    throw new ApiError(404, "NOT_FOUND", "This problem is not scheduled for revision");
  }
  if (!user) throw new ApiError(404, "NOT_FOUND", "User not found");

  const timezone = user.profile?.timezone || "UTC";
  const cachedLongest = user.profile?.longestStreak ?? 0;
  const now = new Date();
  const restart = existingProgress?.status === "NEEDS_REVISION";
  const nextStage = restart ? 0 : Math.min(schedule.stage + 1, REVISION_MAX_STAGE);

  const { updated, rating, streaks } = await prisma.$transaction(async (tx) => {
    // Conditional update: the stage is derived from a read outside this transaction, so
    // guard against a concurrent completion. Without it, two simultaneous reviews could
    // both write stage 3 — losing an advance while timesReviewed still incremented.
    const claimed = await tx.revisionSchedule.updateMany({
      where: {
        id: schedule.id,
        stage: schedule.stage,
        timesReviewed: schedule.timesReviewed,
        archivedAt: null,
      },
      data: {
        stage: nextStage,
        dueAt: dueAtForStage(now, nextStage),
        lastReviewedAt: now,
        timesReviewed: { increment: 1 },
      },
    });

    if (claimed.count === 0) {
      throw new ApiError(409, "CONFLICT", "This revision was just updated — refresh and retry");
    }

    const savedSchedule = await tx.revisionSchedule.findUniqueOrThrow({
      where: { id: schedule.id },
      include: { problem: { select: revisionProblemSelect } },
    });

    const userProblem = await tx.userProblem.upsert({
      where: { userId_problemId: { userId, problemId } },
      create: {
        userId,
        problemId,
        status: "REVISED",
        lastActivityAt: now,
        lastRevisionAt: now,
        difficultyAfterRevision,
      },
      update: {
        status: "REVISED",
        lastActivityAt: now,
        lastRevisionAt: now,
        // undefined leaves the previous rating untouched when none was supplied.
        ...(difficultyAfterRevision ? { difficultyAfterRevision } : {}),
      },
    });

    await recordActivity(tx, {
      userId,
      type: "REVISION_COMPLETED",
      refId: problemId,
      metadata: { stage: nextStage, restarted: restart },
      timezone,
      now,
    });

    const state = await recomputeStreaks(tx, userId, timezone, now);
    if (state.longest > cachedLongest) {
      await tx.profile.update({ where: { userId }, data: { longestStreak: state.longest } });
    }

    return { updated: savedSchedule, rating: userProblem.difficultyAfterRevision, streaks: state };
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

  return { item: toRevisionItemDto(updated, now, rating), streak };
}

/**
 * Revisions the user has completed, most recent first, cursor-paginated.
 *
 * Unlike the queue, this is a record rather than an action list, so mastered (archived)
 * rows are kept — that is the whole point of archiving them. It intentionally does not
 * filter unpublished problems either, for the same reason.
 */
export async function getRevisionHistory(
  userId: string,
  query: RevisionHistoryQuery,
): Promise<RevisionHistoryResponse> {
  const { cursor, limit } = query;

  const where: Prisma.RevisionScheduleWhereInput = { userId, lastReviewedAt: { not: null } };
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (!decoded) throw new ApiError(400, "VALIDATION_FAILED", "Invalid cursor", "cursor");
    const reviewedAt = new Date(decoded.createdAt);
    where.OR = [
      { lastReviewedAt: { lt: reviewedAt } },
      { lastReviewedAt: reviewedAt, id: { lt: decoded.id } },
    ];
  }

  const rows = await prisma.revisionSchedule.findMany({
    where,
    orderBy: [{ lastReviewedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    include: { problem: { select: revisionProblemSelect } },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page.at(-1);

  const ratings = await loadRatings(
    userId,
    page.map((row) => row.problemId),
  );

  return {
    items: page.map((row) => ({
      problemId: row.problemId,
      problem: row.problem,
      lastReviewedAt: row.lastReviewedAt!.toISOString(),
      timesReviewed: row.timesReviewed,
      difficultyAfterRevision: ratings.get(row.problemId) ?? null,
    })),
    nextCursor:
      hasMore && last
        ? encodeCursor({ createdAt: last.lastReviewedAt!.toISOString(), id: last.id })
        : null,
  };
}

/**
 * Aggregate revision numbers, for analytics.
 *
 * `totalReviews` is the schedule's own counter (sum of `timesReviewed`) — the same
 * number the revision history and the XP breakdown use, so the pages cannot disagree.
 * The 30-day window is the one figure that has to come from the activity log, because
 * that is the only place a per-review timestamp is kept.
 */
export async function getRevisionCounts(
  userId: string,
  timezone: string,
  now: Date = new Date(),
): Promise<RevisionCounts> {
  const active = { userId, archivedAt: null } as const;
  // "Overdue" means due before the start of the user's local day — i.e. actually missed.
  const startOfLocalDay = dateKeyToUtcDate(localDateKey(now, timezone));

  const [totals, reviewsLast30Days, activeSchedules, mastered, dueNow, overdue] = await Promise.all([
    prisma.revisionSchedule.aggregate({ where: { userId }, _sum: { timesReviewed: true } }),
    prisma.activityLog.count({
      where: {
        userId,
        type: "REVISION_COMPLETED",
        occurredAt: { gte: new Date(now.getTime() - 30 * DAY_MS) },
      },
    }),
    prisma.revisionSchedule.count({ where: active }),
    prisma.revisionSchedule.count({ where: { userId, archivedAt: { not: null } } }),
    prisma.revisionSchedule.count({
      where: { ...active, dueAt: { lte: now }, problem: { isPublished: true } },
    }),
    prisma.revisionSchedule.count({
      where: { ...active, dueAt: { lt: startOfLocalDay }, problem: { isPublished: true } },
    }),
  ]);

  return {
    totalReviews: totals._sum.timesReviewed ?? 0,
    reviewsLast30Days,
    activeSchedules,
    mastered,
    dueNow,
    overdue,
  };
}

/**
 * Due-today summary for the dashboard — kept compact so the payload stays small.
 * Re-exported here because the schedule is the source of truth for "due".
 */
export async function getRevisionDueSummary(userId: string, now: Date = new Date()) {
  const dueWhere = {
    userId,
    archivedAt: null,
    problem: { isPublished: true },
    dueAt: { lte: now },
  } as const;

  const [rows, count] = await Promise.all([
    prisma.revisionSchedule.findMany({
      where: dueWhere,
      orderBy: { dueAt: "asc" },
      take: 5,
      include: { problem: { select: { id: true, title: true, difficulty: true } } },
    }),
    prisma.revisionSchedule.count({ where: dueWhere }),
  ]);

  return {
    count,
    items: rows.map((row) => ({
      problemId: row.problemId,
      title: row.problem.title,
      difficulty: row.problem.difficulty,
      dueAt: row.dueAt.toISOString(),
      daysOverdue: daysOverdue(row.dueAt, now),
    })),
  };
}
