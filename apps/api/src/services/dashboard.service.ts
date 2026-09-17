import type {
  ActivityDayDto,
  DashboardResponse,
  TopicProgressSummaryDto,
  WeeklyActivityDayDto,
} from "@dsarats/shared";
import { prisma } from "../db";
import { getTodayChallenge } from "./dailyChallenge.service";
import { getProgressSummary } from "./progress.service";
import { getRevisionDueSummary } from "./revision.service";
import {
  addDays,
  getStreakSummary,
  getUserTimezone,
  listActivityDays,
  localDateKey,
  startOfWeekKey,
} from "./streak.service";

/** How many topics the dashboard surfaces before deferring to the Progress page. */
const TOPIC_PROGRESS_LIMIT = 5;

/** Local week, Monday → Sunday, zero-filled so the chart always has seven columns. */
function buildWeeklyActivity(days: ActivityDayDto[], weekStart: string): WeeklyActivityDayDto[] {
  const byDate = new Map(days.map((day) => [day.date, day]));

  return Array.from({ length: 7 }, (_, offset) => {
    const date = addDays(weekStart, offset);
    const day = byDate.get(date);
    return { date, count: day?.count ?? 0, problemsSolved: day?.problemsSolved ?? 0 };
  });
}

/**
 * The topic the user has covered least, ignoring fully-completed topics.
 *
 * Ties break toward the topic with more problems (more room to improve) and then by
 * name, so the same data always yields the same sentence.
 */
function weakestTopic(topics: TopicProgressSummaryDto[]): TopicProgressSummaryDto | null {
  const candidates = topics.filter((topic) => topic.total > 0 && topic.solved < topic.total);
  if (candidates.length === 0) return null;

  return candidates.reduce((worst, topic) => {
    const ratio = topic.solved / topic.total;
    const worstRatio = worst.solved / worst.total;
    if (ratio !== worstRatio) return ratio < worstRatio ? topic : worst;
    if (topic.total !== worst.total) return topic.total > worst.total ? topic : worst;
    return topic.topic.name.localeCompare(worst.topic.name) < 0 ? topic : worst;
  });
}

/** One data-backed observation — never a generic platitude or a fabricated number. */
function buildInsight(input: {
  solved: number;
  total: number;
  weeklySolved: number;
  weeklyGoal: number | null;
  currentStreak: number;
  activeToday: boolean;
  weakest: TopicProgressSummaryDto | null;
}): string {
  const { solved, total, weeklySolved, weeklyGoal, currentStreak, activeToday, weakest } = input;

  if (solved === 0) {
    return "You haven't solved a problem yet — mark your first one solved to start building a streak.";
  }

  const parts = [`You've solved ${solved} of ${total} problems.`];
  if (weakest) {
    parts.push(`${weakest.topic.name} is your least-covered topic (${weakest.solved}/${weakest.total}).`);
  }

  if (weeklyGoal != null) {
    parts.push(`${weeklySolved}/${weeklyGoal} toward this week's goal.`);
  } else if (currentStreak > 0) {
    parts.push(
      activeToday
        ? `Your ${currentStreak}-day streak is active today.`
        : `Practice today to keep your ${currentStreak}-day streak alive.`,
    );
  }

  return parts.join(" ");
}

/**
 * Single dashboard payload: everything the web dashboard needs in one round-trip
 * (plan §5.5). Every number is computed from the user's own rows; nothing is estimated.
 *
 * Note: this fetches today's daily challenge, which is lazily created on first read —
 * the same idempotent behavior as GET /daily-challenge.
 */
export async function getDashboard(userId: string): Promise<DashboardResponse> {
  const timezone = await getUserTimezone(userId);
  const now = new Date();
  const todayKey = localDateKey(now, timezone);
  const weekStart = startOfWeekKey(todayKey);

  const [summary, streak, activityDays, challenge, profile, revisionDue] = await Promise.all([
    getProgressSummary(userId),
    getStreakSummary(userId, timezone, now),
    listActivityDays(userId, weekStart, addDays(weekStart, 6)),
    getTodayChallenge(userId),
    prisma.profile.findUnique({ where: { userId }, select: { learningGoal: true } }),
    getRevisionDueSummary(userId, now),
  ]);

  const solved = summary.totals.solved;
  const weeklySolved = activityDays.reduce((sum, day) => sum + day.problemsSolved, 0);
  const weeklyGoal = profile?.learningGoal ?? null;
  const weakest = solved > 0 ? weakestTopic(summary.byTopic) : null;

  const topicProgress = summary.byTopic
    .filter((topic) => topic.solved > 0 || topic.attempted > 0)
    .sort(
      (a, b) =>
        b.solved - a.solved ||
        b.total - a.total ||
        a.topic.name.localeCompare(b.topic.name),
    )
    .slice(0, TOPIC_PROGRESS_LIMIT);

  return {
    stats: {
      currentStreak: streak.current,
      longestStreak: streak.longest,
      activeToday: streak.activeToday,
      solved,
      solvedToday: activityDays.find((day) => day.date === todayKey)?.problemsSolved ?? 0,
      totalProblems: summary.totals.publishedProblems,
      weeklySolved,
      weeklyGoal,
    },
    challenge,
    continueLearning: summary.bySheet.filter((sheet) => sheet.status === "IN_PROGRESS"),
    weeklyActivity: buildWeeklyActivity(activityDays, weekStart),
    topicProgress,
    revisionDue,
    insight: buildInsight({
      solved,
      total: summary.totals.publishedProblems,
      weeklySolved,
      weeklyGoal,
      currentStreak: streak.current,
      activeToday: streak.activeToday,
      weakest,
    }),
  };
}
