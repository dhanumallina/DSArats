import type { Prisma } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";
import type { WeeklyChallengeResponse } from "@dsarats/shared";
import { prisma } from "../db";
import { isSolvedProgress } from "./gamification.service";
import { localDateKey, startOfWeekKey } from "./streak.service";

/** How many problems one week's set holds. */
const WEEKLY_CHALLENGE_SIZE = 5;

const challengeInclude = {
  problems: {
    orderBy: { position: "asc" },
    include: {
      problem: {
        select: {
          id: true,
          slug: true,
          title: true,
          difficulty: true,
          pattern: true,
          platform: true,
          platformProblemUrl: true,
          solutionUrl: true,
          estimatedMinutes: true,
          topic: { select: { slug: true, name: true } },
        },
      },
    },
  },
} as const;

/** The ISO-8601 week key for a `YYYY-MM-DD` date, e.g. `2026-W38`. */
export function isoWeekKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number) as [number, number, number];
  const thursday = new Date(Date.UTC(year, month - 1, day));
  // Move to the Thursday of this week; the ISO week number is the year of that Thursday.
  thursday.setUTCDate(thursday.getUTCDate() + 3 - ((thursday.getUTCDay() + 6) % 7));

  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 3 - ((firstThursday.getUTCDay() + 6) % 7));

  const week =
    1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Stable 32-bit hash of a string.
 *
 * Used to pick each week's problems, so the set is the same for every learner and does not
 * depend on request order or on how many people have read it.
 */
function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof PrismaNamespace.PrismaClientKnownRequestError && error.code === "P2002";
}

type ChallengeRow = Prisma.WeeklyChallengeGetPayload<{ include: typeof challengeInclude }>;

/**
 * Create the week's set if it does not exist yet.
 *
 * Selection is deterministic: the published catalog ordered stably, entered at an offset
 * derived from the week key. Everyone sees the same problems, and refreshing cannot
 * re-roll them.
 */
async function createWeeklyChallenge(
  weekKey: string,
  weekStart: string,
): Promise<ChallengeRow | null> {
  const catalog = await prisma.problem.findMany({
    where: { isPublished: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  if (catalog.length === 0) return null;

  const size = Math.min(WEEKLY_CHALLENGE_SIZE, catalog.length);
  const offset = hashString(weekKey) % catalog.length;
  const picked = Array.from(
    { length: size },
    (_, step) => catalog[(offset + step) % catalog.length]!.id,
  );

  try {
    return await prisma.weeklyChallenge.create({
      data: {
        weekKey,
        title: `Week of ${weekStart}`,
        description:
          `A shared set of ${size} problems for everyone this week. It is picked ` +
          "deterministically from the published catalog, so it stays the same all week.",
        problems: {
          create: picked.map((problemId, position) => ({ problemId, position })),
        },
      },
      include: challengeInclude,
    });
  } catch (error) {
    // Two readers can race on the first read of a week; the loser simply reads the
    // winner's set rather than creating a second one.
    if (isUniqueViolation(error)) {
      return prisma.weeklyChallenge.findUniqueOrThrow({ where: { weekKey }, include: challengeInclude });
    }
    throw error;
  }
}

/**
 * This week's shared set, plus the viewer's own progress against it.
 *
 * `solvedCount` is derived from the viewer's problem statuses using the app-wide solved
 * rule, so it always agrees with the problem pages instead of being tracked separately.
 */
export async function getWeeklyChallenge(
  userId: string,
  timezone: string,
): Promise<WeeklyChallengeResponse> {
  const today = localDateKey(new Date(), timezone);
  const weekStart = startOfWeekKey(today);
  const weekKey = isoWeekKey(today);

  const challenge =
    (await prisma.weeklyChallenge.findUnique({ where: { weekKey }, include: challengeInclude })) ??
    (await createWeeklyChallenge(weekKey, weekStart));

  if (!challenge) {
    return { challenge: null, solvedCount: 0, totalCount: 0, weekStart };
  }

  const problemIds = challenge.problems.map((row) => row.problemId);
  const progress = await prisma.userProblem.findMany({
    where: { userId, problemId: { in: problemIds } },
    select: { problemId: true, status: true, firstSolvedAt: true },
  });
  const byProblem = new Map(progress.map((row) => [row.problemId, row]));

  const problems = challenge.problems.map((row) => ({
    ...row.problem,
    viewerStatus: byProblem.get(row.problemId)?.status ?? null,
  }));

  return {
    challenge: {
      weekKey: challenge.weekKey,
      title: challenge.title,
      description: challenge.description,
      problems,
    },
    solvedCount: progress.filter((row) => isSolvedProgress(row)).length,
    totalCount: problems.length,
    weekStart,
  };
}
