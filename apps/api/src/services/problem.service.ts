import { Prisma } from "@prisma/client";
import type { ProblemsQuery } from "@dsarats/shared";
import { prisma } from "../db";
import { decodeCursor, encodeCursor } from "../utils/pagination";

const problemSelect = {
  id: true,
  slug: true,
  title: true,
  difficulty: true,
  pattern: true,
  platform: true,
  externalId: true,
  platformProblemUrl: true,
  solutionUrl: true,
  tags: true,
  estimatedMinutes: true,
  timeComplexityHint: true,
  spaceComplexityHint: true,
  createdAt: true,
  topicId: true,
  topic: { select: { slug: true, name: true } },
} as const;

export type ProblemListItem = Prisma.ProblemGetPayload<{ select: typeof problemSelect }> & {
  positionInSheet: number | null;
};

const sortByMap: Record<string, Prisma.ProblemOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  difficulty: { difficulty: "asc" },
  title: { title: "asc" },
};

/** Phase 3: list published problems with search/filter/sort + cursor pagination.
 *  Per-user `status` filtering arrives in Phase 4 with the UserProblem model. */
export async function listProblems(query: ProblemsQuery) {
  const { q, sheet, topic, difficulty, pattern, platform, sort, cursor, limit } = query;

  const where: Prisma.ProblemWhereInput = {
    isPublished: true,
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { tags: { has: q } },
        { pattern: { contains: q, mode: "insensitive" } },
      ],
    }),
    ...(difficulty && { difficulty }),
    ...(platform && { platform }),
    ...(pattern && { pattern: { contains: pattern, mode: "insensitive" } }),
    ...(topic && { topic: { slug: topic } }),
    ...(sheet && { sheets: { some: { sheet: { slug: sheet } } } }),
  };

  const orderBy = sortByMap[sort] ?? sortByMap.newest;

  // Cursor pagination: createdAt + id tiebreak. "newest" pages forward (older),
  // "oldest" pages forward (newer).
  let cursorWhere: Prisma.ProblemWhereInput | undefined;
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (!decoded) throw new Error("INVALID_CURSOR");
    const desc = sort !== "oldest";
    cursorWhere = desc
      ? {
          OR: [
            { createdAt: { lt: new Date(decoded.createdAt) } },
            { createdAt: { equals: new Date(decoded.createdAt) }, id: { lt: decoded.id } },
          ],
        }
      : {
          OR: [
            { createdAt: { gt: new Date(decoded.createdAt) } },
            { createdAt: { equals: new Date(decoded.createdAt) }, id: { gt: decoded.id } },
          ],
        };
  }

  const items = await prisma.problem.findMany({
    where: { AND: [where, cursorWhere ?? {}] },
    select: problemSelect,
    orderBy,
    take: limit + 1,
  });

  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;

  // Position within the requested sheet, when scoped to one.
  let positionByProblem = new Map<string, number>();
  if (sheet) {
    const sheetRow = await prisma.dSASheet.findUnique({ where: { slug: sheet } });
    if (sheetRow) {
      const memberships = await prisma.sheetProblem.findMany({
        where: { sheetId: sheetRow.id, problemId: { in: pageItems.map((p) => p.id) } },
        select: { problemId: true, position: true },
      });
      positionByProblem = new Map(memberships.map((m) => [m.problemId, m.position]));
    }
  }

  const data: ProblemListItem[] = pageItems.map((p) => ({
    ...p,
    positionInSheet: positionByProblem.get(p.id) ?? null,
  }));

  const last = pageItems.at(-1);
  const nextCursor =
    hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null;

  return { items: data, nextCursor };
}

export async function getProblemDetail(id: string) {
  const problem = await prisma.problem.findUnique({
    where: { id, isPublished: true },
    select: { ...problemSelect, _count: { select: { sheets: true } } },
  });
  if (!problem) return null;

  // Related: same topic or same pattern, excluding itself.
  const related = await prisma.problem.findMany({
    where: {
      isPublished: true,
      id: { not: id },
      OR: [
        { topicId: problem.topicId },
        ...(problem.pattern ? [{ pattern: problem.pattern }] : []),
      ],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      difficulty: true,
      topic: { select: { slug: true, name: true } },
    },
    take: 8,
  });

  return { problem, related };
}