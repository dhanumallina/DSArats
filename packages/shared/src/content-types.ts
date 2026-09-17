import type {
  DailyChallengeStatus,
  Difficulty,
  Platform,
  ProblemStatus,
  RevisionDifficulty,
  SheetDifficulty,
} from "./constants";

/** Topic as returned by GET /topics (counts reflect published problems only). */
export interface TopicDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  order: number;
  iconKey: string | null;
  _count: { problems: number };
}

/** Problem row as rendered in sheet lists. */
export interface ProblemDto {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  pattern: string | null;
  platform: Platform;
  platformProblemUrl: string;
  solutionUrl: string | null;
  tags: string[];
  estimatedMinutes: number | null;
  isCore: boolean;
  position: number;
  /** The authenticated viewer's status, or null when anonymous / never touched. */
  viewerStatus: ProblemStatus | null;
}

/** Sheet-level viewer progress, included when the request is authenticated. */
export interface SheetViewer {
  started: boolean;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | null;
  /** Only on the sheet detail response. */
  currentTopicId?: string | null;
}

/** One topic group inside a sheet detail response. */
export interface SheetTopicGroup {
  id: string;
  slug: string;
  name: string;
  problemCount: number;
  problems: ProblemDto[];
}

/** Sheet summary as returned by GET /sheets (public list). */
export interface SheetSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  difficulty: SheetDifficulty;
  estimatedHours: number | null;
  sourceAttribution: string | null;
  problemCount: number;
  difficultyDistribution: Record<Difficulty, number>;
  topics: Array<{ slug: string; name: string }>;
  /** Present (non-null) only for authenticated viewers. */
  viewer: SheetViewer | null;
}

/** Shape returned by GET /api/v1/sheets */
export interface SheetsListResponse {
  sheets: SheetSummary[];
}

/** Sheet detail as returned by GET /sheets/:slug. */
export interface SheetDetailResponse {
  sheet: {
    id: string;
    slug: string;
    name: string;
    description: string;
    difficulty: SheetDifficulty;
    estimatedHours: number | null;
    sourceAttribution: string | null;
    problemCount: number;
    difficultyDistribution: Record<Difficulty, number>;
    topics: SheetTopicGroup[];
  };
  /** Present (non-null) only for authenticated viewers. */
  viewer: SheetViewer | null;
}

/** Shape returned by POST /api/v1/sheets/:slug/start and /complete-topic */
export interface SheetProgressDto {
  id: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  currentTopicId: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface StartSheetResponse {
  progress: SheetProgressDto;
}

/** Item as returned by GET /problems (list/search). */
export interface ProblemListItemDto {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  pattern: string | null;
  platform: Platform;
  externalId: string | null;
  platformProblemUrl: string;
  solutionUrl: string | null;
  tags: string[];
  estimatedMinutes: number | null;
  timeComplexityHint: string | null;
  spaceComplexityHint: string | null;
  createdAt: string;
  topicId: string;
  topic: { slug: string; name: string };
  positionInSheet: number | null;
}

/** Shape returned by GET /api/v1/problems */
export interface ProblemsListResponse {
  items: ProblemListItemDto[];
  nextCursor: string | null;
}

/** Shape returned by GET /api/v1/problems/:id */
export interface ProblemDetailResponse {
  problem: Omit<ProblemListItemDto, "positionInSheet"> & { _count: { sheets: number } };
  related: Array<{
    id: string;
    slug: string;
    title: string;
    difficulty: Difficulty;
    topic: { slug: string; name: string };
  }>;
  /** The requesting user's progress, or null when anonymous / not started. */
  viewer: UserProblemProgressDto | null;
  /**
   * The viewer's active revision state, or null when they have no live schedule
   * (anonymous, never solved, or already mastered).
   */
  revision: RevisionStateDto | null;
}

/** A user's progress on a single problem (Phase 4). */
export interface UserProblemProgressDto {
  problemId: string;
  status: ProblemStatus;
  firstSolvedAt: string | null;
  lastActivityAt: string | null;
  solveCount: number;
}

/** Timezone-aware streak summary. */
export interface StreakSummaryDto {
  current: number;
  longest: number;
  activeToday: boolean;
  /** The user's local calendar date (`YYYY-MM-DD`) the streak is measured against. */
  today: string;
  timezone: string;
}

/** Shape returned by PATCH /api/v1/problems/:id/progress. */
export interface ProblemProgressResponse {
  progress: UserProblemProgressDto;
  streak: StreakSummaryDto;
}

/** The problem behind a daily challenge. */
export interface DailyChallengeProblemDto {
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
}

export interface DailyChallengeDto {
  id: string;
  /** Calendar date the challenge belongs to (`YYYY-MM-DD`). */
  date: string;
  reason: string | null;
  problem: DailyChallengeProblemDto;
}

export interface DailyChallengeCompletionDto {
  status: DailyChallengeStatus;
  completedAt: string;
}

/** Shape returned by GET /api/v1/daily-challenge. `challenge` is null when the catalog is empty. */
export interface DailyChallengeResponse {
  challenge: DailyChallengeDto | null;
  completion: DailyChallengeCompletionDto | null;
}

/** Shape returned by POST /api/v1/daily-challenge/complete. */
export interface DailyChallengeCompleteResponse {
  challenge: DailyChallengeDto;
  completion: DailyChallengeCompletionDto;
  streak: StreakSummaryDto;
}

/** Shape returned by GET /api/v1/daily-challenge/history. */
export interface DailyChallengeHistoryResponse {
  items: Array<{
    challenge: DailyChallengeDto;
    completion: DailyChallengeCompletionDto;
  }>;
  nextCursor: string | null;
}

/** Shape returned by GET /api/v1/topics */
export interface TopicsResponse {
  topics: TopicDto[];
}

/** Shape returned by GET /api/v1/topics/:slug/problems */
export interface TopicProblemsResponse {
  topic: { id: string; slug: string; name: string; description: string | null } | null;
  problems: Array<{
    id: string;
    slug: string;
    title: string;
    difficulty: Difficulty;
    pattern: string | null;
    platformProblemUrl: string;
    estimatedMinutes: number | null;
  }>;
}

// ── Phase 5: revision & notebook ─────────────────────────────────────────────

/** The problem behind a revision queue item. */
export interface RevisionProblemDto {
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
}

/** One item in the spaced-revision queue. */
export interface RevisionItemDto {
  problemId: string;
  problem: RevisionProblemDto;
  /** 0..4 → 1/3/7/14/30-day intervals. */
  stage: number;
  dueAt: string;
  lastReviewedAt: string | null;
  timesReviewed: number;
  /** Whole days past due (0 when due today or not yet due). */
  daysOverdue: number;
  /** The user's most recent self-rating for this problem. */
  difficultyAfterRevision: RevisionDifficulty | null;
}

/** Shape returned by GET /api/v1/revision. */
export interface RevisionQueueResponse {
  items: RevisionItemDto[];
  /** Total items due now, even when `items` is capped for display. */
  dueCount: number;
  /** Total scheduled problems (due or not). */
  scheduledCount: number;
  timezone: string;
}

/** Shape returned by POST /api/v1/revision/:problemId/complete. */
export interface RevisionCompleteResponse {
  item: RevisionItemDto;
  streak: StreakSummaryDto;
}

/** Shape returned by GET /api/v1/revision/history. */
export interface RevisionHistoryResponse {
  items: Array<{
    problemId: string;
    problem: RevisionProblemDto;
    lastReviewedAt: string;
    timesReviewed: number;
    difficultyAfterRevision: RevisionDifficulty | null;
  }>;
  nextCursor: string | null;
}

/** The viewer's live revision state for one problem (Phase 5). */
export interface RevisionStateDto {
  /** 0..4 → 1/3/7/14/30-day intervals. */
  stage: number;
  dueAt: string;
  lastReviewedAt: string | null;
  timesReviewed: number;
  /** Whole days past due; 0 for anything due today or later. */
  daysOverdue: number;
  /** The user's most recent self-rating, or null before their first review. */
  difficultyAfterRevision: RevisionDifficulty | null;
}

/** The notebook entry for one problem. */
export interface NoteDto {
  problemId: string;
  approach: string | null;
  mistakes: string | null;
  optimalApproach: string | null;
  revisionNotes: string | null;
  keyPatterns: string | null;
  updatedAt: string;
}

/** Shape returned by GET/PUT /api/v1/problems/:id/notes. `note` is null until first saved. */
export interface NoteResponse {
  note: NoteDto | null;
}

/** Compact revision summary embedded in the dashboard payload. */
export interface RevisionDueSummaryDto {
  count: number;
  items: Array<{
    problemId: string;
    title: string;
    difficulty: Difficulty;
    dueAt: string;
    daysOverdue: number;
  }>;
}

// ── Phase 4: progress, streak & dashboard ────────────────────────────────────

/** One day's aggregated meaningful activity (from the user's streak records). */
export interface ActivityDayDto {
  /** Local calendar date (`YYYY-MM-DD`) in the user's timezone. */
  date: string;
  /** Meaningful activity types recorded that day, deduped. */
  activityTypes: string[];
  /** PROBLEM_SOLVED activities that day (re-solves included). */
  problemsSolved: number;
  /** Meaningful activities recorded that day — drives heatmap intensity. */
  count: number;
}

/** Shape returned by GET /api/v1/streak. */
export interface StreakResponse extends StreakSummaryDto {
  /** Month the calendar covers (`YYYY-MM`). */
  month: string;
  /** Active days in that month, oldest first (inactive days omitted). */
  calendar: ActivityDayDto[];
}

/** Catalog-wide totals for the user (published problems only). */
export interface ProgressTotalsDto {
  publishedProblems: number;
  /** Distinct problems the user has ever solved (`firstSolvedAt` set). */
  solved: number;
  /** Problems marked ATTEMPTED that were never solved. */
  attempted: number;
  notStarted: number;
}

/** Per-topic progress summary. */
export interface TopicProgressSummaryDto {
  topic: { slug: string; name: string };
  total: number;
  solved: number;
  attempted: number;
  notStarted: number;
}

/** Per-sheet progress summary, including the viewer's sheet status. */
export interface SheetProgressSummaryDto {
  sheet: { slug: string; name: string };
  total: number;
  solved: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  currentTopic: { slug: string; name: string } | null;
}

/** Shape returned by GET /api/v1/progress. */
export interface ProgressSummaryResponse {
  totals: ProgressTotalsDto;
  /** Count of the user's problems per status (published problems only). */
  byStatus: Record<ProblemStatus, number>;
  byDifficulty: Record<Difficulty, { total: number; solved: number }>;
  byTopic: TopicProgressSummaryDto[];
  bySheet: SheetProgressSummaryDto[];
}

/** Shape returned by GET /api/v1/progress/heatmap. */
export interface ActivityHeatmapResponse {
  year: number;
  timezone: string;
  /** Active days only, oldest first. */
  days: ActivityDayDto[];
  activeDays: number;
  totalSolved: number;
  /** Highest daily activity count in the year (0 when there is no activity). */
  maxCount: number;
}

/** One column in the dashboard's weekly activity chart. */
export interface WeeklyActivityDayDto {
  date: string;
  count: number;
  problemsSolved: number;
}

/** Shape returned by GET /api/v1/dashboard. */
export interface DashboardResponse {
  stats: {
    currentStreak: number;
    longestStreak: number;
    activeToday: boolean;
    /** Distinct problems ever solved. */
    solved: number;
    /** Problems solved on the user's local day. */
    solvedToday: number;
    /** Size of the published catalog. */
    totalProblems: number;
    /** Solves since the start of the user's local week (Monday). */
    weeklySolved: number;
    /** Profile goal in problems per week, or null when unset. */
    weeklyGoal: number | null;
  };
  challenge: DailyChallengeResponse;
  /** Started-but-unfinished sheets, ready to resume. */
  continueLearning: SheetProgressSummaryDto[];
  /** The user's local week, Monday → Sunday (zero-filled). */
  weeklyActivity: WeeklyActivityDayDto[];
  /** Topics the user has engaged with, most solved first. */
  topicProgress: TopicProgressSummaryDto[];
  /** Spaced-revision items due now (Phase 5); `count` may exceed the listed items. */
  revisionDue: RevisionDueSummaryDto;
  /** One-sentence observation derived only from the user's own data. */
  insight: string;
}
