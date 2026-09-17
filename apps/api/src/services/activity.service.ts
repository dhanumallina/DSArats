import type { ActivityType, Prisma } from "@prisma/client";
import {
  countsTowardStreak,
  currentStreak,
  dateKeyToUtcDate,
  localDateKey,
  longestStreak,
  utcDateToKey,
} from "./streak.service";

export interface StreakState {
  current: number;
  longest: number;
  activeToday: boolean;
  today: string;
}

interface RecordActivityInput {
  userId: string;
  type: ActivityType;
  /** problemId / challengeId the activity refers to, when applicable. */
  refId?: string | null;
  metadata?: Prisma.InputJsonValue;
  timezone: string;
  now?: Date;
  /**
   * Whether this activity counts toward the day's solved-problem total. Defaults to
   * `PROBLEM_SOLVED`; callers pass it explicitly for activities that are a solve under
   * another type (e.g. a daily challenge marked SOLVED), so weekly goals stay honest.
   */
  countsAsSolved?: boolean;
}

/**
 * Append an activity row and, when the activity is meaningful, upsert that day's
 * streak record (plan §4.3).
 *
 * The streak upsert is keyed on (userId, activeDate), so any number of meaningful
 * activities on the same local day produce exactly one streak day — duplicates can
 * never double-count.
 */
export async function recordActivity(
  tx: Prisma.TransactionClient,
  {
    userId,
    type,
    refId,
    metadata,
    timezone,
    now = new Date(),
    countsAsSolved,
  }: RecordActivityInput,
): Promise<void> {
  await tx.activityLog.create({
    data: { userId, type, refId: refId ?? null, metadata, occurredAt: now },
  });

  if (!countsTowardStreak(type)) return;

  const activeDate = dateKeyToUtcDate(localDateKey(now, timezone));
  const existing = await tx.streakRecord.findUnique({
    where: { userId_activeDate: { userId, activeDate } },
  });

  // Merge rather than push, so the day's type list never accumulates duplicates.
  const activityTypes = [...new Set([...(existing?.activityTypes ?? []), type])];
  const solvedIncrement = (countsAsSolved ?? type === "PROBLEM_SOLVED") ? 1 : 0;

  await tx.streakRecord.upsert({
    where: { userId_activeDate: { userId, activeDate } },
    create: {
      userId,
      activeDate,
      activityTypes,
      problemsSolved: solvedIncrement,
      sessionsCount: 1,
    },
    update: {
      activityTypes,
      problemsSolved: { increment: solvedIncrement },
      sessionsCount: { increment: 1 },
    },
  });
}

/** Recompute a user's streak state from their records, in their own timezone. */
export async function recomputeStreaks(
  tx: Prisma.TransactionClient,
  userId: string,
  timezone: string,
  now: Date = new Date(),
): Promise<StreakState> {
  const rows = await tx.streakRecord.findMany({ where: { userId }, select: { activeDate: true } });
  const active = new Set(rows.map((row) => utcDateToKey(row.activeDate)));
  const today = localDateKey(now, timezone);

  return {
    current: currentStreak(active, today),
    longest: longestStreak(active),
    activeToday: active.has(today),
    today,
  };
}
