import type { Difficulty, Platform, ProblemStatus } from "./constants";

/**
 * Who may see a learner's profile.
 *
 * PRIVATE is the default so nobody is exposed by signing up; publishing is an explicit
 * opt-in the learner makes in Settings.
 */
export const PROFILE_VISIBILITY = {
  PRIVATE: "PRIVATE",
  PUBLIC: "PUBLIC",
} as const;
export type ProfileVisibility = (typeof PROFILE_VISIBILITY)[keyof typeof PROFILE_VISIBILITY];

/** PUBLIC groups are listable and open to join; PRIVATE ones are invite-only. */
export const GROUP_VISIBILITY = {
  PUBLIC: "PUBLIC",
  PRIVATE: "PRIVATE",
} as const;
export type GroupVisibility = (typeof GROUP_VISIBILITY)[keyof typeof GROUP_VISIBILITY];

export const GROUP_ROLE = {
  OWNER: "OWNER",
  MEMBER: "MEMBER",
} as const;
export type GroupRole = (typeof GROUP_ROLE)[keyof typeof GROUP_ROLE];

/** Mirrors the ActivityType enum, so the client can label activity rows. */
export const ACTIVITY_TYPE = {
  PROBLEM_SOLVED: "PROBLEM_SOLVED",
  PROBLEM_ATTEMPTED: "PROBLEM_ATTEMPTED",
  REVISION_COMPLETED: "REVISION_COMPLETED",
  DAILY_CHALLENGE: "DAILY_CHALLENGE",
  NOTE_UPDATED: "NOTE_UPDATED",
  LEARNING_SESSION: "LEARNING_SESSION",
} as const;
export type ActivityType = (typeof ACTIVITY_TYPE)[keyof typeof ACTIVITY_TYPE];

// ── Public profile ───────────────────────────────────────────────────────────

/**
 * Aggregates a published profile exposes.
 *
 * Safe by construction: counts only, all derived from the learner's own activity. No
 * email, no timezone, no notebook, and no free text the learner did not choose to share.
 */
export interface PublicProfileStatsDto {
  solved: number;
  attempted: number;
  mastered: number;
  currentStreak: number;
  longestStreak: number;
  reviewsCompleted: number;
  challengesSolved: number;
  xp: number;
  level: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
  /** Distinct topics the learner has practised. */
  topicsEngaged: number;
}

export interface PublicProfileDto {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  joinedAt: string;
  /** PRIVATE can only ever appear on your own profile (anyone else gets a 404). */
  visibility: ProfileVisibility;
  /** True when the requester is looking at their own profile. */
  isSelf: boolean;
  stats: PublicProfileStatsDto;
}

/** Shape returned by GET /api/v1/users/:username. */
export interface PublicProfileResponse {
  profile: PublicProfileDto;
}

// ── Leaderboards ─────────────────────────────────────────────────────────────

export const LEADERBOARD_METRIC = {
  XP: "xp",
  SOLVED: "solved",
  STREAK: "streak",
} as const;
export type LeaderboardMetric = (typeof LEADERBOARD_METRIC)[keyof typeof LEADERBOARD_METRIC];

export interface LeaderboardEntryDto {
  rank: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  /** The ranked metric's value for this learner. */
  value: number;
  isSelf: boolean;
}

/** Shape returned by GET /api/v1/leaderboards. */
export interface LeaderboardsResponse {
  metric: LeaderboardMetric;
  /** Top of the board. */
  entries: LeaderboardEntryDto[];
  /** The requester's own row, even when they fall outside `entries` (null if unranked). */
  viewer: LeaderboardEntryDto | null;
  /** How many learners have published a profile — the pool actually being ranked. */
  rankedProfiles: number;
}

// ── Study groups ─────────────────────────────────────────────────────────────

export interface StudyGroupCreatorDto {
  username: string;
  displayName: string | null;
}

export interface StudyGroupDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  visibility: GroupVisibility;
  memberCount: number;
  createdAt: string;
  createdBy: StudyGroupCreatorDto | null;
  /** Whether the authenticated requester is a member (always false for anonymous). */
  joined: boolean;
  /** The requester's role, or null when they are not a member. */
  viewerRole: GroupRole | null;
}

export interface StudyGroupsResponse {
  groups: StudyGroupDto[];
}

export interface StudyGroupResponse {
  group: StudyGroupDto;
}

export interface GroupMemberDto {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: GroupRole;
  joinedAt: string;
}

/** Shape returned by GET /api/v1/community/groups/:slug. */
export interface StudyGroupDetailResponse {
  group: StudyGroupDto;
  members: GroupMemberDto[];
}

// ── Community activity ───────────────────────────────────────────────────────

export interface CommunityActivityItemDto {
  /** Handle of the learner — only ever published profiles appear here. */
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  type: ActivityType;
  /** The problem the activity refers to, when there is one. */
  problemTitle: string | null;
  occurredAt: string;
}

/** Shape returned by GET /api/v1/community/activity. */
export interface CommunityActivityResponse {
  items: CommunityActivityItemDto[];
}

// ── Weekly challenge ─────────────────────────────────────────────────────────

export interface WeeklyChallengeProblemDto {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  pattern: string | null;
  platform: Platform;
  platformProblemUrl: string;
  solutionUrl: string | null;
  estimatedMinutes: number | null;
  topic: { slug: string; name: string };
  /** The viewer's current status for this problem, or null when untouched. */
  viewerStatus: ProblemStatus | null;
}

export interface WeeklyChallengeDto {
  weekKey: string;
  title: string;
  description: string | null;
  problems: WeeklyChallengeProblemDto[];
}

/**
 * Shape returned by GET /api/v1/weekly-challenge.
 *
 * `solvedCount` is derived from the viewer's own problem statuses, so it always agrees
 * with the problem pages rather than being tracked separately.
 */
export interface WeeklyChallengeResponse {
  challenge: WeeklyChallengeDto | null;
  solvedCount: number;
  totalCount: number;
  /** The viewer's local week start (Monday) as `YYYY-MM-DD`. */
  weekStart: string;
}
