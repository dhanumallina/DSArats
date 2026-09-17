import { z } from "zod";
import {
  DAILY_CHALLENGE_STATUS,
  DIFFICULTY,
  LIMITS,
  PLATFORM,
  PROBLEM_STATUS,
  REVISION_DIFFICULTY,
  SHEET_DIFFICULTY,
} from "./constants";

const difficultyEnum = z.enum([DIFFICULTY.EASY, DIFFICULTY.MEDIUM, DIFFICULTY.HARD]);
const sheetDifficultyEnum = z.enum([
  SHEET_DIFFICULTY.BEGINNER,
  SHEET_DIFFICULTY.INTERMEDIATE,
  SHEET_DIFFICULTY.ADVANCED,
]);
const platformEnum = z.enum([
  PLATFORM.LEETCODE,
  PLATFORM.GEEKSFORGEEKS,
  PLATFORM.CODEFORCES,
  PLATFORM.OTHER,
]);

const slugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and dashes");

/** GET /api/v1/problems — search, filter, sort, paginate. `status` filter arrives in Phase 4. */
export const problemsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  sheet: slugSchema.optional(),
  topic: slugSchema.optional(),
  difficulty: difficultyEnum.optional(),
  pattern: z.string().trim().max(60).optional(),
  platform: platformEnum.optional(),
  sort: z.enum(["newest", "oldest", "difficulty", "title"]).default("newest"),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ProblemsQuery = z.infer<typeof problemsQuerySchema>;

/** PATCH /api/v1/problems/:id/progress — set a user's status for one problem. */
export const problemProgressSchema = z
  .object({
    status: z.enum([
      PROBLEM_STATUS.NOT_STARTED,
      PROBLEM_STATUS.ATTEMPTED,
      PROBLEM_STATUS.SOLVED,
      PROBLEM_STATUS.NEEDS_REVISION,
      PROBLEM_STATUS.REVISED,
      PROBLEM_STATUS.MASTERED,
    ]),
  })
  .strict();
export type ProblemProgressInput = z.infer<typeof problemProgressSchema>;

/**
 * GET /api/v1/daily-challenge — optional selection options.
 *
 * These only steer creation of the day's challenge: once it exists for the user's
 * local date it stays stable, so the daily challenge is never re-rolled on refresh.
 */
export const dailyChallengeQuerySchema = z.object({
  strategy: z.enum(["recommended", "random"]).default("recommended"),
  topic: z.string().min(1).max(80).optional(),
  difficulty: difficultyEnum.optional(),
});
export type DailyChallengeQuery = z.infer<typeof dailyChallengeQuerySchema>;

/** POST /api/v1/daily-challenge/complete — mark today's challenge. */
export const dailyChallengeCompleteSchema = z
  .object({
    status: z.enum([
      DAILY_CHALLENGE_STATUS.SOLVED,
      DAILY_CHALLENGE_STATUS.ATTEMPTED,
      DAILY_CHALLENGE_STATUS.SKIPPED,
    ]),
  })
  .strict();
export type DailyChallengeCompleteInput = z.infer<typeof dailyChallengeCompleteSchema>;

/** GET /api/v1/daily-challenge/history */
export const dailyChallengeHistoryQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type DailyChallengeHistoryQuery = z.infer<typeof dailyChallengeHistoryQuerySchema>;

/** GET /api/v1/streak — defaults to the user's current local month. */
export const streakQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be formatted as YYYY-MM")
    .optional(),
});
export type StreakQuery = z.infer<typeof streakQuerySchema>;

/** GET /api/v1/progress/heatmap — defaults to the user's current local year. */
export const heatmapQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});
export type HeatmapQuery = z.infer<typeof heatmapQuerySchema>;

/** GET /api/v1/revision — the queue, or only what is due. */
export const revisionQuerySchema = z.object({
  due: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
});
export type RevisionQuery = z.infer<typeof revisionQuerySchema>;

/** POST /api/v1/revision/:problemId/complete */
export const revisionCompleteSchema = z
  .object({
    difficultyAfterRevision: z
      .enum([
        REVISION_DIFFICULTY.EASIER,
        REVISION_DIFFICULTY.SAME,
        REVISION_DIFFICULTY.HARDER,
      ])
      .optional(),
  })
  .strict();
export type RevisionCompleteInput = z.infer<typeof revisionCompleteSchema>;

/** GET /api/v1/revision/history */
export const revisionHistoryQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type RevisionHistoryQuery = z.infer<typeof revisionHistoryQuerySchema>;

/** PUT /api/v1/problems/:id/notes — partial, autosave-friendly (null clears a field). */
export const noteUpsertSchema = z
  .object({
    approach: z.string().max(LIMITS.NOTE_FIELD_MAX).nullable().optional(),
    mistakes: z.string().max(LIMITS.NOTE_FIELD_MAX).nullable().optional(),
    optimalApproach: z.string().max(LIMITS.NOTE_FIELD_MAX).nullable().optional(),
    revisionNotes: z.string().max(LIMITS.NOTE_FIELD_MAX).nullable().optional(),
    keyPatterns: z.string().max(LIMITS.NOTE_FIELD_MAX).nullable().optional(),
  })
  .strict();
export type NoteUpsertInput = z.infer<typeof noteUpsertSchema>;

/** POST /api/v1/sheets/:slug/start */
export const startSheetSchema = z.object({}).strict();

/** POST /api/v1/sheets/:slug/complete-topic */
export const completeTopicSchema = z.object({
  topicId: z.string().uuid(),
});

/** Admin: sheet create/update */
export const adminSheetCreateSchema = z
  .object({
    slug: slugSchema,
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(2000),
    difficulty: sheetDifficultyEnum.default(SHEET_DIFFICULTY.BEGINNER),
    estimatedHours: z.coerce.number().int().min(1).max(2000).optional(),
    sourceAttribution: z.string().trim().max(500).optional(),
    isPublished: z.boolean().default(false),
  })
  .strict();

export const adminSheetUpdateSchema = adminSheetCreateSchema.partial();

/** Admin: topic create/update */
export const adminTopicCreateSchema = z
  .object({
    slug: slugSchema,
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).optional(),
    order: z.coerce.number().int().min(0).default(0),
    iconKey: z.string().trim().max(40).optional(),
  })
  .strict();

export const adminTopicUpdateSchema = adminTopicCreateSchema.partial();

/** Admin: problem create/update */
export const adminProblemCreateSchema = z
  .object({
    slug: slugSchema,
    title: z.string().trim().min(1).max(200),
    difficulty: difficultyEnum.default(DIFFICULTY.EASY),
    topicSlug: slugSchema,
    pattern: z.string().trim().max(60).optional(),
    platform: platformEnum.default(PLATFORM.LEETCODE),
    externalId: z.string().trim().max(120).optional(),
    platformProblemUrl: z.string().url().max(500),
    solutionUrl: z.string().url().max(500).optional(),
    tags: z.array(z.string().trim().max(40)).max(10).default([]),
    estimatedMinutes: z.coerce.number().int().min(1).max(600).optional(),
    timeComplexityHint: z.string().trim().max(200).optional(),
    spaceComplexityHint: z.string().trim().max(200).optional(),
    isPublished: z.boolean().default(false),
  })
  .strict();

export const adminProblemUpdateSchema = adminProblemCreateSchema.partial();

/** Admin: add a problem to a sheet at a position */
export const adminSheetProblemSchema = z
  .object({
    problemId: z.string().uuid(),
    position: z.coerce.number().int().min(0),
    isCore: z.boolean().default(false),
  })
  .strict();

/** Admin: set/refresh a sheet's topic ordering */
export const adminSheetTopicsSchema = z
  .object({
    topicSlugs: z.array(slugSchema).min(1).max(40),
  })
  .strict();