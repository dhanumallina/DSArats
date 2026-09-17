import type { ActivityType } from "@prisma/client";
import { STREAK_ACTIVITY_TYPES } from "@dsarats/shared";
import type { ActivityDayDto, StreakResponse, StreakSummaryDto } from "@dsarats/shared";
import { prisma } from "../db";

/**
 * The user's local calendar date (`YYYY-MM-DD`) for an instant.
 *
 * Streaks are calendar-day based in the user's own timezone (plan §4.3), so we must
 * never use the server's date. Falls back to UTC for an unknown/invalid timezone
 * rather than failing a write on bad profile data.
 */
export function localDateKey(instant: Date, timezone: string): string {
  const format = (zone: string): string => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(instant);
    const value = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return `${value("year")}-${value("month")}-${value("day")}`;
  };

  try {
    return format(timezone);
  } catch {
    return format("UTC");
  }
}

/** Shift a `YYYY-MM-DD` key by whole days (UTC arithmetic — keys are date-only). */
export function addDays(key: string, delta: number): string {
  const [year, month, day] = key.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

/**
 * The first day (Monday) of the local week containing `key`.
 *
 * The weekly goal runs Monday → Sunday so "this week" is stable regardless of
 * locale, matching the ISO-week convention in the plan (§4.3).
 */
export function startOfWeekKey(key: string): string {
  const [year, month, day] = key.split("-").map(Number) as [number, number, number];
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = Sunday
  return addDays(key, weekday === 0 ? -6 : 1 - weekday);
}

/** First and last `YYYY-MM-DD` keys of a `YYYY-MM` month, inclusive. */
export function monthRange(monthKey: string): { from: string; to: string } {
  const [year, month] = monthKey.split("-").map(Number) as [number, number];
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate(); // month is 1-based → day 0 is the last
  return { from: `${monthKey}-01`, to: `${monthKey}-${String(lastDay).padStart(2, "0")}` };
}

/** A `YYYY-MM-DD` key as the midnight-UTC Date that `@db.Date` columns store. */
export function dateKeyToUtcDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

/**
 * The inverse of {@link dateKeyToUtcDate} for values read back from the database.
 *
 * Prisma maps `@db.Date` to a Date at UTC midnight irrespective of the process
 * timezone (verified against this project's driver), so a plain ISO slice is exact.
 */
export function utcDateToKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Current streak: consecutive active days ending today.
 *
 * Grace rule (plan §4.3): if today is not active yet, the streak survives as long as
 * yesterday was active — so it doesn't die mid-day before the user practises.
 */
export function currentStreak(activeKeys: Iterable<string>, todayKey: string): number {
  const active = activeKeys instanceof Set ? activeKeys : new Set(activeKeys);

  let cursor = active.has(todayKey) ? todayKey : addDays(todayKey, -1);
  if (!active.has(cursor)) return 0;

  let streak = 0;
  while (active.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive active days in the user's history. */
export function longestStreak(activeKeys: Iterable<string>): number {
  const sorted = [...new Set(activeKeys)].sort();

  let longest = 0;
  let run = 0;
  let previous: string | null = null;

  for (const key of sorted) {
    run = previous !== null && addDays(previous, 1) === key ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = key;
  }

  return longest;
}

/** True when an activity type is meaningful enough to keep a streak day alive (plan §4.3). */
export function countsTowardStreak(type: ActivityType): boolean {
  return (STREAK_ACTIVITY_TYPES as readonly string[]).includes(type);
}

/** Read-only streak summary for a user, measured in their own timezone. */
export async function getStreakSummary(
  userId: string,
  timezone: string,
  now: Date = new Date(),
): Promise<StreakSummaryDto> {
  const today = localDateKey(now, timezone);

  const [rows, profile] = await Promise.all([
    prisma.streakRecord.findMany({ where: { userId }, select: { activeDate: true } }),
    prisma.profile.findUnique({ where: { userId }, select: { longestStreak: true } }),
  ]);

  const active = new Set(rows.map((row) => utcDateToKey(row.activeDate)));

  return {
    current: currentStreak(active, today),
    // The cached value keeps historic records even if the streak rows are ever pruned.
    longest: Math.max(profile?.longestStreak ?? 0, longestStreak(active)),
    activeToday: active.has(today),
    today,
    timezone,
  };
}

/** The user's configured timezone, defaulting to UTC when no profile exists. */
export async function getUserTimezone(userId: string): Promise<string> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { timezone: true },
  });
  return profile?.timezone || "UTC";
}

/**
 * The user's active days between two date keys (inclusive), oldest first.
 *
 * Reads the pre-aggregated streak rows rather than the raw activity log: they are
 * already keyed on the user's local day and deduped per day, so heatmaps and calendars
 * cannot drift from the streak numbers.
 */
export async function listActivityDays(
  userId: string,
  fromKey: string,
  toKey: string,
): Promise<ActivityDayDto[]> {
  const rows = await prisma.streakRecord.findMany({
    where: {
      userId,
      activeDate: { gte: dateKeyToUtcDate(fromKey), lte: dateKeyToUtcDate(toKey) },
    },
    orderBy: { activeDate: "asc" },
    select: { activeDate: true, activityTypes: true, problemsSolved: true, sessionsCount: true },
  });

  return rows.map((row) => ({
    date: utcDateToKey(row.activeDate),
    activityTypes: row.activityTypes,
    problemsSolved: row.problemsSolved,
    count: row.sessionsCount,
  }));
}

/** Streak summary plus a month-long activity calendar for GET /streak. */
export async function getStreakResponse(
  userId: string,
  timezone: string,
  month?: string,
): Promise<StreakResponse> {
  const now = new Date();
  const targetMonth = month ?? localDateKey(now, timezone).slice(0, 7);
  const { from, to } = monthRange(targetMonth);

  const [summary, calendar] = await Promise.all([
    getStreakSummary(userId, timezone, now),
    listActivityDays(userId, from, to),
  ]);

  return { ...summary, month: targetMonth, calendar };
}
