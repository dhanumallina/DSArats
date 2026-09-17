import type { Prisma } from "@prisma/client";
import { levelForXp, XP_RULES } from "@dsarats/shared";
import type { LeaderboardEntryDto, LeaderboardMetric, LeaderboardsResponse } from "@dsarats/shared";
import { prisma } from "../db";

/** How many rows the board shows. The viewer's own row is returned even if outside this. */
const LEADERBOARD_LIMIT = 50;

/**
 * The board ranks only learners who published their profile.
 *
 * Opting in is what makes a learner rankable, so this is not a directory of everyone: it
 * is exactly the set of people who asked to be compared. Every value is computed from real
 * rows — nothing is seeded, padded, or invented to make the board look populated.
 *
 * Scaling note: the aggregation covers every published profile, so if the opted-in
 * population grows large this should become a materialized ranking rather than being
 * computed per request. At current scale the four grouped queries are cheap.
 */
export async function getLeaderboard(
  metric: LeaderboardMetric,
  viewerId?: string,
): Promise<LeaderboardsResponse> {
  const profiles = await prisma.profile.findMany({
    where: { visibility: "PUBLIC" },
    select: {
      userId: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      // Maintained whenever a longer streak is recomputed, so the board can read it
      // instead of replaying every streak record for every learner.
      longestStreak: true,
    },
  });

  if (profiles.length === 0) {
    return { metric, entries: [], viewer: null, rankedProfiles: 0 };
  }

  const userIds = profiles.map((profile) => profile.userId);
  const solvedWhere: Prisma.UserProblemWhereInput = {
    userId: { in: userIds },
    OR: [
      { firstSolvedAt: { not: null } },
      { status: { in: ["SOLVED", "NEEDS_REVISION", "REVISED", "MASTERED"] } },
    ],
  };

  const [solvedRows, masteredRows, reviewRows, challengeRows] = await Promise.all([
    prisma.userProblem.groupBy({ by: ["userId"], where: solvedWhere, _count: { _all: true } }),
    prisma.userProblem.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, status: "MASTERED" },
      _count: { _all: true },
    }),
    prisma.revisionSchedule.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds } },
      _sum: { timesReviewed: true },
    }),
    prisma.dailyChallengeCompletion.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, status: "SOLVED" },
      _count: { _all: true },
    }),
  ]);

  const countByUser = (rows: Array<{ userId: string; _count: { _all: number } }>) =>
    new Map(rows.map((row) => [row.userId, row._count._all]));

  const solvedByUser = countByUser(solvedRows);
  const masteredByUser = countByUser(masteredRows);
  const challengesByUser = countByUser(challengeRows);
  const reviewsByUser = new Map(reviewRows.map((row) => [row.userId, row._sum.timesReviewed ?? 0]));

  const ranked = profiles
    .map((profile) => {
      const solved = solvedByUser.get(profile.userId) ?? 0;
      const mastered = masteredByUser.get(profile.userId) ?? 0;
      const reviews = reviewsByUser.get(profile.userId) ?? 0;
      const challenges = challengesByUser.get(profile.userId) ?? 0;

      // Derived exactly the way GET /xp derives it, so the board and a learner's own XP
      // page can never disagree about the same number.
      const xp =
        solved * XP_RULES.PROBLEM_SOLVED +
        mastered * XP_RULES.PROBLEM_MASTERED +
        reviews * XP_RULES.REVISION_COMPLETED +
        challenges * XP_RULES.DAILY_CHALLENGE;

      const value = metric === "solved" ? solved : metric === "streak" ? profile.longestStreak : xp;

      return {
        userId: profile.userId,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        level: levelForXp(xp),
        value,
      };
    })
    // Ties break on handle so the same data always produces the same board order.
    .sort((a, b) => b.value - a.value || a.username.localeCompare(b.username));

  const toEntry = (row: (typeof ranked)[number], index: number): LeaderboardEntryDto => ({
    rank: index + 1,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    level: row.level,
    value: row.value,
    isSelf: viewerId !== undefined && row.userId === viewerId,
  });

  const entries = ranked.slice(0, LEADERBOARD_LIMIT).map(toEntry);

  // A private (or unranked) viewer gets no row rather than a rank they did not opt into —
  // which is also why `rankedProfiles` is returned, so the UI can explain the pool.
  const viewerIndex = viewerId === undefined ? -1 : ranked.findIndex((row) => row.userId === viewerId);

  return {
    metric,
    entries,
    viewer: viewerIndex === -1 ? null : toEntry(ranked[viewerIndex]!, viewerIndex),
    rankedProfiles: ranked.length,
  };
}
