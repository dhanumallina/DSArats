import type { Difficulty, Platform, SheetDifficulty } from "./constants";

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

/** Problem row as rendered in sheet lists (per-problem status arrives in Phase 4). */
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
