import { SOLVED_OVER_TIME_DAYS } from "@dsarats/shared";
import type { AnalyticsResponse, SolvedOverTimePointDto } from "@dsarats/shared";
import { prisma } from "../db";
import { computeAchievementMetrics, xpSummaryFromMetrics } from "./gamification.service";
import { getProgressSummary } from "./progress.service";
import { computeReadiness, countPublishedTopics, readinessInputFrom } from "./readiness.service";
import { getRevisionCounts } from "./revision.service";
import { addDays, localDateKey } from "./streak.service";

/**
 * Distinct solves per local day for the trailing window, oldest first and zero-filled.
 *
 * Seeded from `firstSolvedAt`, so a re-solve never adds a second solve on the same day
 * and the chart cannot disagree with the "solved" total.
 */
async function getSolvedOverTime(
  userId: string,
  timezone: string,
  now: Date,
): Promise<SolvedOverTimePointDto[]> {
  const today = localDateKey(now, timezone);
  const keys = Array.from({ length: SOLVED_OVER_TIME_DAYS }, (_, offset) =>
    addDays(today, offset - (SOLVED_OVER_TIME_DAYS - 1)),
  );
  const window = new Set(keys);

  // Bound the query by the oldest day in the window rather than scanning all history.
  const oldest = new Date(`${keys[0]}T00:00:00.000Z`);
  const rows = await prisma.userProblem.findMany({
    where: { userId, firstSolvedAt: { gte: new Date(oldest.getTime() - 24 * 60 * 60 * 1000) } },
    select: { firstSolvedAt: true },
  });

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.firstSolvedAt) continue;
    const key = localDateKey(row.firstSolvedAt, timezone);
    if (!window.has(key)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return keys.map((date) => ({ date, solved: counts.get(date) ?? 0 }));
}

/**
 * Everything the analytics page charts, in one payload (plan §5.8).
 *
 * Shares the readiness estimate rather than fetching it separately, so the page and the
 * dedicated readiness endpoint can never display two different scores.
 */
export async function getAnalytics(userId: string, timezone: string): Promise<AnalyticsResponse> {
  const now = new Date();

  // One metrics pass feeds XP, the readiness estimate, and (via /achievements) the badge
  // progress, so the page cannot show two different versions of the same count.
  const [summary, revision, metrics, totalTopics, solvedOverTime] = await Promise.all([
    getProgressSummary(userId),
    getRevisionCounts(userId, timezone, now),
    computeAchievementMetrics(prisma, userId),
    countPublishedTopics(),
    getSolvedOverTime(userId, timezone, now),
  ]);

  const { solved, attempted } = summary.totals;
  const attempts = solved + attempted;

  return {
    timezone,
    totals: summary.totals,
    byStatus: summary.byStatus,
    byDifficulty: summary.byDifficulty,
    byTopic: summary.byTopic,
    solvedOverTime,
    revision,
    // No attempts means no evidence either way — reporting 0% would be a false claim.
    successRate: attempts === 0 ? null : solved / attempts,
    xp: xpSummaryFromMetrics(metrics),
    readiness: computeReadiness(
      readinessInputFrom({ summary, metrics, revision, totalTopics }),
    ),
  };
}
