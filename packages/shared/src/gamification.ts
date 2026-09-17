// Phase 6: gamification — the single source of truth for what can be earned.
//
// Every achievement is a metric plus a threshold, where the metric is a statistic
// derived from the user's own rows. Nothing is awarded by hand and nothing is
// time-limited or randomized, so the same activity always earns the same thing.

/** User statistics an achievement can be measured against. */
export const ACHIEVEMENT_METRIC = {
  SOLVED: "SOLVED",
  MASTERED: "MASTERED",
  REVISIONS: "REVISIONS",
  DAILY_CHALLENGES: "DAILY_CHALLENGES",
  LONGEST_STREAK: "LONGEST_STREAK",
  TOPICS_ENGAGED: "TOPICS_ENGAGED",
  HARD_SOLVED: "HARD_SOLVED",
  SHEETS_COMPLETED: "SHEETS_COMPLETED",
} as const;
export type AchievementMetric = (typeof ACHIEVEMENT_METRIC)[keyof typeof ACHIEVEMENT_METRIC];

/** One achievement definition. `iconKey` maps to a client-side icon. */
export interface AchievementDefinition {
  key: string;
  name: string;
  description: string;
  iconKey: string;
  metric: AchievementMetric;
  threshold: number;
  order: number;
}

/**
 * The achievement catalogue, in display order.
 *
 * Ordered so the earliest wins come first: a new user sees progress toward the top of
 * the list rather than a wall of locked rows.
 */
export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    key: "first-solve",
    name: "First Solve",
    description: "Solve your first problem.",
    iconKey: "check",
    metric: "SOLVED",
    threshold: 1,
    order: 10,
  },
  {
    key: "first-review",
    name: "First Review",
    description: "Complete your first spaced revision.",
    iconKey: "rotate",
    metric: "REVISIONS",
    threshold: 1,
    order: 20,
  },
  {
    key: "solved-10",
    name: "Ten Down",
    description: "Solve 10 distinct problems.",
    iconKey: "target",
    metric: "SOLVED",
    threshold: 10,
    order: 30,
  },
  {
    key: "streak-7",
    name: "Seven-Day Streak",
    description: "Reach a 7-day activity streak.",
    iconKey: "flame",
    metric: "LONGEST_STREAK",
    threshold: 7,
    order: 40,
  },
  {
    key: "topics-5",
    name: "Five Topics",
    description: "Practise problems from 5 different topics.",
    iconKey: "layers",
    metric: "TOPICS_ENGAGED",
    threshold: 5,
    order: 50,
  },
  {
    key: "challenge-7",
    name: "Week of Challenges",
    description: "Solve 7 daily challenges.",
    iconKey: "calendar",
    metric: "DAILY_CHALLENGES",
    threshold: 7,
    order: 60,
  },
  {
    key: "hard-1",
    name: "Hard Mode",
    description: "Solve a HARD problem.",
    iconKey: "zap",
    metric: "HARD_SOLVED",
    threshold: 1,
    order: 70,
  },
  {
    key: "mastered-1",
    name: "Mastered One",
    description: "Master a problem through revision.",
    iconKey: "award",
    metric: "MASTERED",
    threshold: 1,
    order: 80,
  },
  {
    key: "sheet-1",
    name: "Sheet Complete",
    description: "Complete a sheet.",
    iconKey: "book",
    metric: "SHEETS_COMPLETED",
    threshold: 1,
    order: 90,
  },
  {
    key: "solved-50",
    name: "Fifty Down",
    description: "Solve 50 distinct problems.",
    iconKey: "target",
    metric: "SOLVED",
    threshold: 50,
    order: 100,
  },
  {
    key: "revision-50",
    name: "Review Habit",
    description: "Complete 50 spaced revisions.",
    iconKey: "rotate",
    metric: "REVISIONS",
    threshold: 50,
    order: 110,
  },
  {
    key: "streak-30",
    name: "Thirty-Day Streak",
    description: "Reach a 30-day activity streak.",
    iconKey: "flame",
    metric: "LONGEST_STREAK",
    threshold: 30,
    order: 120,
  },
  {
    key: "topics-10",
    name: "Broad Base",
    description: "Practise problems from 10 different topics.",
    iconKey: "layers",
    metric: "TOPICS_ENGAGED",
    threshold: 10,
    order: 130,
  },
  {
    key: "mastered-10",
    name: "Mastery",
    description: "Master 10 problems.",
    iconKey: "award",
    metric: "MASTERED",
    threshold: 10,
    order: 140,
  },
  {
    key: "solved-100",
    name: "Century",
    description: "Solve 100 distinct problems.",
    iconKey: "trophy",
    metric: "SOLVED",
    threshold: 100,
    order: 150,
  },
  {
    key: "hard-25",
    name: "Hard Grinder",
    description: "Solve 25 HARD problems.",
    iconKey: "zap",
    metric: "HARD_SOLVED",
    threshold: 25,
    order: 160,
  },
  {
    key: "streak-100",
    name: "Centurion Streak",
    description: "Reach a 100-day activity streak.",
    iconKey: "trophy",
    metric: "LONGEST_STREAK",
    threshold: 100,
    order: 170,
  },
] as const;

/** Achievement keys, useful for tests and for typing the seed data. */
export type AchievementKey = (typeof ACHIEVEMENTS)[number]["key"];

/**
 * XP awarded per unit of real activity.
 *
 * Deliberately a small, published table rather than an opaque score: XP is derived from
 * these counts on read, so it can always be traced back to the work that earned it.
 * Re-solving a problem never pays twice — the counts are of distinct problems and
 * genuine reviews.
 */
export const XP_RULES = {
  PROBLEM_SOLVED: 10,
  PROBLEM_MASTERED: 25,
  REVISION_COMPLETED: 5,
  DAILY_CHALLENGE: 15,
} as const;
export type XpSourceKey = keyof typeof XP_RULES;

/** Human labels for the XP breakdown, so the total is explainable in the UI. */
export const XP_SOURCE_LABEL: Record<XpSourceKey, string> = {
  PROBLEM_SOLVED: "Problems solved",
  PROBLEM_MASTERED: "Problems mastered",
  REVISION_COMPLETED: "Revisions completed",
  DAILY_CHALLENGE: "Daily challenges solved",
};

/** XP needed to move up one level. Levels are deliberately flat and predictable. */
export const XP_PER_LEVEL = 250;

/** The level a total XP figure corresponds to (1-based). */
export function levelForXp(totalXp: number): number {
  return Math.floor(Math.max(0, totalXp) / XP_PER_LEVEL) + 1;
}

/** How many trailing days the solved-over-time chart covers. */
export const SOLVED_OVER_TIME_DAYS = 90;

// ── Response shapes ──────────────────────────────────────────────────────────

/** One line of the XP breakdown. */
export interface XpSourceDto {
  key: XpSourceKey;
  label: string;
  count: number;
  pointsEach: number;
  points: number;
}

/** Shape returned by GET /api/v1/xp. */
export interface XpSummaryDto {
  total: number;
  level: number;
  /** XP earned since reaching the current level. */
  pointsIntoLevel: number;
  /** XP still needed to reach the next level. */
  pointsToNextLevel: number;
  /** Total XP at which the next level begins. */
  nextLevelAt: number;
  sources: XpSourceDto[];
}

/** One achievement with this user's progress toward it. */
export interface AchievementDto {
  key: string;
  name: string;
  description: string;
  iconKey: string;
  metric: AchievementMetric;
  threshold: number;
  order: number;
  /** The user's current value for the metric (capped at the threshold). */
  progress: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

/** Shape returned by GET /api/v1/achievements. */
export interface AchievementsResponse {
  achievements: AchievementDto[];
  unlockedCount: number;
  totalCount: number;
}
