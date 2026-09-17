import type { Difficulty, ProgressSummaryResponse, ReadinessDto, ReadinessFactorDto, ReadinessFactorKey } from "@dsarats/shared";
import { prisma } from "../db";
import { computeAchievementMetrics, type AchievementMetrics } from "./gamification.service";
import { getProgressSummary } from "./progress.service";
import { getRevisionCounts, type RevisionCounts } from "./revision.service";
import { getUserTimezone } from "./streak.service";

/**
 * Factor weights, in the order they are presented. They sum to exactly 1.
 *
 * Coverage and revision carry the most weight because they are the two things the
 * product can actually evidence: how much of the catalog is done, and whether solved
 * problems are being kept alive. Streak is smallest on purpose — consistency helps, but
 * it is the least direct signal of interview readiness.
 */
const WEIGHTS: Record<ReadinessFactorKey, number> = {
  COVERAGE: 0.4,
  BREADTH: 0.15,
  DIFFICULTY: 0.15,
  REVISION: 0.2,
  CONSISTENCY: 0.1,
};

const LABELS: Record<ReadinessFactorKey, string> = {
  COVERAGE: "Catalog coverage",
  BREADTH: "Topic breadth",
  DIFFICULTY: "Difficulty mix",
  REVISION: "Revision follow-through",
  CONSISTENCY: "Consistency",
};

/** Streak length that counts as fully consistent, in days. */
const CONSISTENCY_TARGET_DAYS = 30;

export const READINESS_DISCLAIMER =
  "An estimate built only from your activity in DSARats — problems solved, topics " +
  "covered, difficulty mix, and revision follow-through. It is not a prediction or a " +
  "guarantee, and it does not account for practice anywhere else.";

export interface ReadinessInput {
  publishedProblems: number;
  solved: number;
  byDifficulty: Record<Difficulty, { total: number; solved: number }>;
  topicsEngaged: number;
  totalTopics: number;
  reviewsCompleted: number;
  overdue: number;
  longestStreak: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Plain-language band, so the number is never presented bare. */
function bandFor(score: number, solved: number): string {
  if (solved === 0) return "Not enough data yet";
  if (score >= 75) return "Strong";
  if (score >= 50) return "Solid";
  if (score >= 25) return "Building";
  return "Early";
}

/**
 * Turn the user's own numbers into a 0..100 estimate.
 *
 * Pure and total on purpose: every factor exposes the sub-score, the weight, the points
 * it contributed, and the raw counts behind it, so the result can be checked rather
 * than trusted. A user with no activity scores 0 and is labelled as such — there is no
 * baseline score awarded for merely signing up.
 */
export function computeReadiness(input: ReadinessInput): ReadinessDto {
  const {
    publishedProblems,
    solved,
    byDifficulty,
    topicsEngaged,
    totalTopics,
    reviewsCompleted,
    overdue,
    longestStreak: streak,
  } = input;

  const easy = byDifficulty.EASY.solved;
  const medium = byDifficulty.MEDIUM.solved;
  const hard = byDifficulty.HARD.solved;

  // A solved EASY problem is worth a third of a HARD one, so working up the difficulty
  // ladder moves the score more than piling up volume at the easy end.
  const difficultyMix = solved === 0 ? 0 : (easy * 1 + medium * 2 + hard * 3) / (3 * solved);

  const values: Record<ReadinessFactorKey, number> = {
    COVERAGE: publishedProblems === 0 ? 0 : solved / publishedProblems,
    BREADTH: totalTopics === 0 ? 0 : topicsEngaged / totalTopics,
    DIFFICULTY: difficultyMix,
    // Of the reviews the user owed or completed, how many they actually did. Someone
    // with nothing scheduled yet has no revision evidence, so this is legitimately 0.
    REVISION:
      reviewsCompleted + overdue === 0 ? 0 : reviewsCompleted / (reviewsCompleted + overdue),
    CONSISTENCY: Math.min(1, streak / CONSISTENCY_TARGET_DAYS),
  };

  const details: Record<ReadinessFactorKey, string> = {
    COVERAGE: `${solved} of ${publishedProblems} catalog problems solved`,
    BREADTH: `${topicsEngaged} of ${totalTopics} topics practised`,
    DIFFICULTY: `${easy} easy · ${medium} medium · ${hard} hard solved`,
    REVISION: `${reviewsCompleted} reviews completed, ${overdue} overdue`,
    CONSISTENCY: `Longest streak ${streak} day${streak === 1 ? "" : "s"}`,
  };

  const factors: ReadinessFactorDto[] = (Object.keys(WEIGHTS) as ReadinessFactorKey[]).map((key) => {
    const value = clamp01(values[key]);
    const weight = WEIGHTS[key];
    return {
      key,
      label: LABELS[key],
      value,
      weight,
      points: value * weight * 100,
      detail: details[key],
    };
  });

  const score = Math.round(factors.reduce((sum, factor) => sum + factor.points, 0));

  return { score, band: bandFor(score, solved), factors, disclaimer: READINESS_DISCLAIMER };
}

/** Assemble the estimate's inputs from already-loaded parts, so callers can share work. */
export function readinessInputFrom(parts: {
  summary: ProgressSummaryResponse;
  metrics: AchievementMetrics;
  revision: RevisionCounts;
  totalTopics: number;
}): ReadinessInput {
  return {
    publishedProblems: parts.summary.totals.publishedProblems,
    solved: parts.summary.totals.solved,
    byDifficulty: parts.summary.byDifficulty,
    topicsEngaged: parts.metrics.TOPICS_ENGAGED,
    totalTopics: parts.totalTopics,
    reviewsCompleted: parts.revision.totalReviews,
    overdue: parts.revision.overdue,
    longestStreak: parts.metrics.LONGEST_STREAK,
  };
}

/** Topics that actually carry at least one published problem. */
export function countPublishedTopics(): Promise<number> {
  return prisma.topic.count({ where: { problems: { some: { isPublished: true } } } });
}

/** The estimate for one user, gathered from their own rows. */
export async function getReadiness(userId: string): Promise<ReadinessDto> {
  const timezone = await getUserTimezone(userId);
  const [summary, metrics, revision, totalTopics] = await Promise.all([
    getProgressSummary(userId),
    computeAchievementMetrics(prisma, userId),
    getRevisionCounts(userId, timezone),
    countPublishedTopics(),
  ]);

  return computeReadiness(readinessInputFrom({ summary, metrics, revision, totalTopics }));
}
