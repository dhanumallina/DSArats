/** Problem difficulty levels. */
export const DIFFICULTY = {
  EASY: "EASY",
  MEDIUM: "MEDIUM",
  HARD: "HARD",
} as const;
export type Difficulty = (typeof DIFFICULTY)[keyof typeof DIFFICULTY];

/** Sheet difficulty levels. */
export const SHEET_DIFFICULTY = {
  BEGINNER: "BEGINNER",
  INTERMEDIATE: "INTERMEDIATE",
  ADVANCED: "ADVANCED",
} as const;
export type SheetDifficulty = (typeof SHEET_DIFFICULTY)[keyof typeof SHEET_DIFFICULTY];

/** User problem statuses (workflow: Not Started → Attempted → Solved → Revised → Mastered). */
export const PROBLEM_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  ATTEMPTED: "ATTEMPTED",
  SOLVED: "SOLVED",
  NEEDS_REVISION: "NEEDS_REVISION",
  REVISED: "REVISED",
  MASTERED: "MASTERED",
} as const;
export type ProblemStatus = (typeof PROBLEM_STATUS)[keyof typeof PROBLEM_STATUS];

/** How a user finished (or declined) the daily challenge. */
export const DAILY_CHALLENGE_STATUS = {
  SOLVED: "SOLVED",
  ATTEMPTED: "ATTEMPTED",
  SKIPPED: "SKIPPED",
} as const;
export type DailyChallengeStatus =
  (typeof DAILY_CHALLENGE_STATUS)[keyof typeof DAILY_CHALLENGE_STATUS];

/** Revision intervals in days, indexed by stage (0..4). */
export const REVISION_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;

/** Highest revision stage — the 30-day interval repeats from here until mastered. */
export const REVISION_MAX_STAGE = REVISION_INTERVALS_DAYS.length - 1;

/** How hard a problem felt after a revision (self-reported, never inferred). */
export const REVISION_DIFFICULTY = {
  EASIER: "EASIER",
  SAME: "SAME",
  HARDER: "HARDER",
} as const;
export type RevisionDifficulty =
  (typeof REVISION_DIFFICULTY)[keyof typeof REVISION_DIFFICULTY];

/** Meaningful activity types that count toward a streak day. */
export const STREAK_ACTIVITY_TYPES = [
  "PROBLEM_SOLVED",
  "REVISION_COMPLETED",
  "DAILY_CHALLENGE",
  "LEARNING_SESSION",
] as const;

/** Platform identifiers for problems. */
export const PLATFORM = {
  LEETCODE: "LEETCODE",
  GEEKSFORGEEKS: "GEEKSFORGEEKS",
  CODEFORCES: "CODEFORCES",
  OTHER: "OTHER",
} as const;
export type Platform = (typeof PLATFORM)[keyof typeof PLATFORM];

/** User roles for RBAC. */
export const USER_ROLE = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

/** Theme preference. */
export const THEME = {
  LIGHT: "LIGHT",
  DARK: "DARK",
  SYSTEM: "SYSTEM",
} as const;
export type Theme = (typeof THEME)[keyof typeof THEME];

/** Cookie names for auth tokens. */
export const COOKIE_NAMES = {
  ACCESS: "dsarats_access",
  REFRESH: "dsarats_refresh",
} as const;

/** Validation limits. */
export const LIMITS = {
  EMAIL_MAX: 254,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 72,
  USERNAME_MIN: 3,
  USERNAME_MAX: 20,
  DISPLAY_NAME_MAX: 60,
  BIO_MAX: 500,
  /** Max length of a single notebook field. */
  NOTE_FIELD_MAX: 20_000,
  /** Weekly learning goal bounds, in problems per week. */
  WEEKLY_GOAL_MIN: 1,
  WEEKLY_GOAL_MAX: 100,
} as const;

/** Access token TTL. */
export const ACCESS_TOKEN_TTL = "15m";
/** Refresh token lifetime in days. */
export const REFRESH_TOKEN_TTL_DAYS = 30;