import { z } from "zod";
import { DIFFICULTY, PLATFORM, SHEET_DIFFICULTY } from "./constants";

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