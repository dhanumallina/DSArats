import { ACHIEVEMENTS } from "@dsarats/shared";
import type { PublicProfileResponse, PublicProfileStatsDto } from "@dsarats/shared";
import { prisma } from "../db";
import { ApiError } from "./auth.service";
import { computeAchievementMetrics, xpSummaryFromMetrics } from "./gamification.service";
import { getStreakSummary } from "./streak.service";

/** Problems attempted but never solved — the same definition /progress uses. */
function attemptedCount(userId: string): Promise<number> {
  return prisma.userProblem.count({ where: { userId, status: "ATTEMPTED" } });
}

/**
 * A learner's profile, as anyone allowed to see it may see it.
 *
 * Privacy is enforced here rather than in the client: a PRIVATE profile is reported as
 * not-found to everyone except its owner, so the endpoint cannot be used to discover
 * which handles exist. The payload is a safe projection — counts, plus the fields the
 * learner chose to share. Email, timezone, notebook, and session data are never selected,
 * so they cannot leak by accident.
 */
export async function getPublicProfile(
  username: string,
  viewerId?: string,
): Promise<PublicProfileResponse> {
  const profile = await prisma.profile.findUnique({
    where: { username },
    select: {
      userId: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      visibility: true,
      createdAt: true,
      user: { select: { id: true } },
    },
  });

  const isSelf = profile !== null && viewerId !== undefined && profile.userId === viewerId;

  // The same response for "no such learner" and "that learner is private": a different
  // status for the two would turn this endpoint into a handle-existence oracle.
  if (!profile || (profile.visibility === "PRIVATE" && !isSelf)) {
    throw new ApiError(404, "NOT_FOUND", "Profile not found");
  }

  // One metrics pass feeds every published count (the same figures the learner sees on
  // their own dashboard), so the profile cannot disagree with the rest of the app.
  const [metrics, timezone, achievementsUnlocked, attempted] = await Promise.all([
    computeAchievementMetrics(prisma, profile.userId),
    // Read, never returned: streaks are measured in the learner's own timezone, and the
    // caller only ever sees the resulting number.
    prisma.profile
      .findUnique({ where: { userId: profile.userId }, select: { timezone: true } })
      .then((row) => row?.timezone || "UTC"),
    prisma.userAchievement.count({ where: { userId: profile.userId } }),
    attemptedCount(profile.userId),
  ]);

  const streak = await getStreakSummary(profile.userId, timezone);
  const xp = xpSummaryFromMetrics(metrics);

  const stats: PublicProfileStatsDto = {
    solved: metrics.SOLVED,
    attempted,
    mastered: metrics.MASTERED,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    reviewsCompleted: metrics.REVISIONS,
    challengesSolved: metrics.DAILY_CHALLENGES,
    xp: xp.total,
    level: xp.level,
    achievementsUnlocked,
    achievementsTotal: ACHIEVEMENTS.length,
    topicsEngaged: metrics.TOPICS_ENGAGED,
  };

  return {
    profile: {
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      joinedAt: profile.createdAt.toISOString(),
      visibility: profile.visibility,
      isSelf,
      stats,
    },
  };
}
