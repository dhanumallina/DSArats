import type { Difficulty, ProblemStatus } from "./constants";
import type { ProgressTotalsDto, TopicProgressSummaryDto } from "./content-types";
import type { XpSummaryDto } from "./gamification";

/** Distinct problems solved on one local day. */
export interface SolvedOverTimePointDto {
  /** Local calendar date (`YYYY-MM-DD`) in the user's timezone. */
  date: string;
  solved: number;
}

/** How the user's revision schedule is actually being kept up with. */
export interface RevisionActivityDto {
  /** Reviews completed in total. */
  totalReviews: number;
  /** Reviews completed in the last 30 days. */
  reviewsLast30Days: number;
  /** Problems currently scheduled (active, not mastered). */
  activeSchedules: number;
  /** Problems mastered so far. */
  mastered: number;
  /** Reviews due right now. */
  dueNow: number;
  /** Scheduled problems past their due date. */
  overdue: number;
}

export interface DifficultyBucketDto {
  total: number;
  solved: number;
}

/** Shape returned by GET /api/v1/analytics. */
export interface AnalyticsResponse {
  timezone: string;
  totals: ProgressTotalsDto;
  byStatus: Record<ProblemStatus, number>;
  byDifficulty: Record<Difficulty, DifficultyBucketDto>;
  byTopic: TopicProgressSummaryDto[];
  /**
   * Distinct solves per local day for the trailing window (oldest first, zero-filled)
   * so the chart has a continuous axis.
   */
  solvedOverTime: SolvedOverTimePointDto[];
  revision: RevisionActivityDto;
  /**
   * Distinct problems solved ÷ (solved + attempted-but-never-solved).
   * Null until the user has attempted anything — a rate over no attempts is not 0%.
   */
  successRate: number | null;
  xp: XpSummaryDto;
  readiness: ReadinessDto;
}

/** The inputs that feed the readiness estimate. */
export type ReadinessFactorKey =
  | "COVERAGE"
  | "BREADTH"
  | "DIFFICULTY"
  | "REVISION"
  | "CONSISTENCY";

/** One factor behind the readiness estimate, with its inputs exposed. */
export interface ReadinessFactorDto {
  key: ReadinessFactorKey;
  label: string;
  /** Sub-score in 0..1, derived from the user's own data. */
  value: number;
  /** Weight in the total; weights always sum to 1. */
  weight: number;
  /** Points this factor contributes to the 0..100 score. */
  points: number;
  /** The raw numbers behind the sub-score, so the claim can be checked. */
  detail: string;
}

/** Shape returned by GET /api/v1/analytics/readiness. */
export interface ReadinessDto {
  /** 0..100 estimate. */
  score: number;
  /** Plain-language band for the score. */
  band: string;
  factors: ReadinessFactorDto[];
  /** Always present: this is an estimate from in-app activity, not a prediction. */
  disclaimer: string;
}
