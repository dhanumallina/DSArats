import { z } from "zod";
import { GROUP_VISIBILITY, LEADERBOARD_METRIC } from "./community-types";
import { LIMITS } from "./constants";

/** POST /api/v1/community/groups */
export const createStudyGroupSchema = z
  .object({
    name: z.string().trim().min(3, "Give the group a name of at least 3 characters").max(60),
    description: z.string().trim().max(LIMITS.BIO_MAX).optional(),
    visibility: z
      .enum([GROUP_VISIBILITY.PUBLIC, GROUP_VISIBILITY.PRIVATE])
      .default(GROUP_VISIBILITY.PUBLIC),
  })
  .strict();
export type CreateStudyGroupInput = z.infer<typeof createStudyGroupSchema>;

/**
 * GET /api/v1/leaderboards
 *
 * The metric is what gets ranked; all three are derived from real activity.
 */
export const leaderboardQuerySchema = z.object({
  metric: z
    .enum([LEADERBOARD_METRIC.XP, LEADERBOARD_METRIC.SOLVED, LEADERBOARD_METRIC.STREAK])
    .default(LEADERBOARD_METRIC.XP),
});
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;

/**
 * GET /api/v1/users/:username
 *
 * Deliberately loose: an unknown handle simply resolves to nothing, so tightening the
 * format here would only turn a 404 into a 400 without protecting anything.
 */
export const publicProfileParamsSchema = z.object({
  username: z.string().trim().min(1).max(LIMITS.USERNAME_MAX),
});
