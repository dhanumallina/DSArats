import { Router } from "express";
import { z } from "zod";
import type { SheetProgressStatus } from "@prisma/client";
import { ApiError } from "../services/auth.service";
import { optionalAuth, requireAuth, type AuthedRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { prisma } from "../db";
import { sendOk } from "../utils/response";

const router = Router();

const slugParamsSchema = z.object({ slug: z.string().min(1).max(80) });
const topicIdSchema = z.object({ topicId: z.string().uuid() });

/** GET /sheets — public list of published sheets with counts + difficulty distribution.
 *  Authenticated viewers additionally get their own started/status progress. */
router.get("/", optionalAuth, async (req: AuthedRequest, res) => {
  const sheets = await prisma.dSASheet.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    include: {
      topics: {
        orderBy: { position: "asc" },
        select: { topic: { select: { slug: true, name: true } } },
      },
      problems: { select: { problem: { select: { difficulty: true } } } },
      _count: { select: { problems: true } },
    },
  });

  // Viewer progress for all sheets in one query (empty map for anonymous viewers).
  const userId = req.user?.id;
  const statusBySheet = new Map<string, SheetProgressStatus>();
  if (userId && sheets.length > 0) {
    const progressRows = await prisma.userSheetProgress.findMany({
      where: { userId, sheetId: { in: sheets.map((s) => s.id) } },
      select: { sheetId: true, status: true },
    });
    for (const row of progressRows) statusBySheet.set(row.sheetId, row.status);
  }

  const data = sheets.map((s) => {
    const counts: Record<string, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
    for (const sp of s.problems) {
      if (sp.problem) counts[sp.problem.difficulty] = (counts[sp.problem.difficulty] ?? 0) + 1;
    }
    const status = statusBySheet.get(s.id) ?? null;
    return {
      id: s.id,
      slug: s.slug,
      name: s.name,
      description: s.description,
      difficulty: s.difficulty,
      estimatedHours: s.estimatedHours,
      sourceAttribution: s.sourceAttribution,
      problemCount: s._count.problems,
      difficultyDistribution: counts,
      topics: s.topics.map((t) => ({ slug: t.topic.slug, name: t.topic.name })),
      viewer: userId ? { started: status !== null, status } : null,
    };
  });

  sendOk(res, { sheets: data });
});

/** GET /sheets/:slug — public detail, problems grouped by topic in sheet order.
 *  Authenticated viewers additionally get their sheet-level progress.
 *  Per-problem status arrives in Phase 4 with the UserProblem model. */
router.get("/:slug", optionalAuth, validate({ params: slugParamsSchema }), async (req: AuthedRequest, res) => {
  const { slug } = req.params as z.infer<typeof slugParamsSchema>;
  const userId = req.user?.id;

  const sheet = await prisma.dSASheet.findUnique({
    where: { slug, isPublished: true },
    include: {
      topics: {
        orderBy: { position: "asc" },
        include: { topic: true },
      },
      problems: {
        orderBy: { position: "asc" },
        include: { problem: { include: { topic: true } } },
      },
      ...(userId && {
        userProgress: { where: { userId }, select: { status: true, currentTopicId: true } },
      }),
    },
  });

  if (!sheet) throw new ApiError(404, "NOT_FOUND", "Sheet not found");

  // Group ordered problems by the sheet's topic ordering.
  const topicOrder = sheet.topics.map((st) => st.topicId);
  interface Group {
    topic: { id: string; slug: string; name: string };
    problems: Array<{
      id: string;
      slug: string;
      title: string;
      difficulty: string;
      pattern: string | null;
      platform: string;
      platformProblemUrl: string;
      solutionUrl: string | null;
      tags: string[];
      estimatedMinutes: number | null;
      isCore: boolean;
      position: number;
    }>;
  }
  const groups = new Map<string, Group>();
  for (const st of sheet.topics) {
    groups.set(st.topic.id, { topic: { id: st.topic.id, slug: st.topic.slug, name: st.topic.name }, problems: [] });
  }
  for (const sp of sheet.problems) {
    const topicId = sp.problem.topicId;
    const group = groups.get(topicId);
    const entry = {
      id: sp.problem.id,
      slug: sp.problem.slug,
      title: sp.problem.title,
      difficulty: sp.problem.difficulty as string,
      pattern: sp.problem.pattern,
      platform: sp.problem.platform as string,
      platformProblemUrl: sp.problem.platformProblemUrl,
      solutionUrl: sp.problem.solutionUrl,
      tags: sp.problem.tags,
      estimatedMinutes: sp.problem.estimatedMinutes,
      isCore: sp.isCore,
      position: sp.position,
    };
    if (group) {
      group.problems.push(entry);
    } else {
      // Problem's topic isn't a declared sheet topic — keep it under its own topic group.
      const key = `other-${topicId}`;
      if (!groups.has(key)) {
        groups.set(key, {
          topic: { id: topicId, slug: sp.problem.topic.slug, name: sp.problem.topic.name },
          problems: [],
        });
      }
      groups.get(key)!.problems.push(entry);
    }
  }

  const orderedGroups = topicOrder
    .map((id) => groups.get(id))
    .filter((g): g is NonNullable<typeof g> => !!g)
    .concat([...groups.entries()].filter(([id]) => !topicOrder.includes(id)).map(([, g]) => g));

  const difficultyCounts: Record<string, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
  for (const g of orderedGroups) {
    for (const p of g.problems) {
      difficultyCounts[p.difficulty] = (difficultyCounts[p.difficulty] ?? 0) + 1;
    }
  }

  // Viewer data: sheet-level progress only (per-problem status is Phase 4).
  let viewerStatus: SheetProgressStatus | null = null;
  let currentTopicId: string | null = null;
  if (userId) {
    const progress = (
      sheet as { userProgress?: Array<{ status: SheetProgressStatus; currentTopicId: string | null }> }
    ).userProgress?.[0];
    viewerStatus = progress?.status ?? null;
    currentTopicId = progress?.currentTopicId ?? null;
  }

  sendOk(res, {
    sheet: {
      id: sheet.id,
      slug: sheet.slug,
      name: sheet.name,
      description: sheet.description,
      difficulty: sheet.difficulty,
      estimatedHours: sheet.estimatedHours,
      sourceAttribution: sheet.sourceAttribution,
      problemCount: sheet.problems.length,
      difficultyDistribution: difficultyCounts,
      topics: orderedGroups.map((g) => ({
        id: g.topic.id,
        slug: g.topic.slug,
        name: g.topic.name,
        problemCount: g.problems.length,
        problems: g.problems,
      })),
    },
    viewer: userId ? { started: viewerStatus !== null, status: viewerStatus, currentTopicId } : null,
  });
});

/** POST /sheets/:slug/start — begin (or resume) a sheet. */
router.post("/:slug/start", requireAuth, validate({ params: slugParamsSchema }), async (req: AuthedRequest, res) => {
  const { slug } = req.params as z.infer<typeof slugParamsSchema>;
  const userId = req.user!.id;

  const sheet = await prisma.dSASheet.findUnique({ where: { slug, isPublished: true } });
  if (!sheet) throw new ApiError(404, "NOT_FOUND", "Sheet not found");

  const existing = await prisma.userSheetProgress.findUnique({
    where: { userId_sheetId: { userId, sheetId: sheet.id } },
  });

  if (existing) {
    sendOk(res, { progress: existing });
    return;
  }

  // Start on the first topic of the sheet.
  const firstTopic = await prisma.sheetTopic.findFirst({
    where: { sheetId: sheet.id },
    orderBy: { position: "asc" },
  });

  const progress = await prisma.userSheetProgress.create({
    data: {
      userId,
      sheetId: sheet.id,
      status: "IN_PROGRESS",
      currentTopicId: firstTopic?.topicId ?? null,
    },
  });

  sendOk(res, { progress }, 201);
});

/** POST /sheets/:slug/complete-topic — advance current topic to the next in sheet order. */
router.post(
  "/:slug/complete-topic",
  requireAuth,
  validate({ params: slugParamsSchema, body: topicIdSchema }),
  async (req: AuthedRequest, res) => {
    const { slug } = req.params as z.infer<typeof slugParamsSchema>;
    const { topicId } = req.body as z.infer<typeof topicIdSchema>;
    const userId = req.user!.id;

    const sheet = await prisma.dSASheet.findUnique({ where: { slug, isPublished: true } });
    if (!sheet) throw new ApiError(404, "NOT_FOUND", "Sheet not found");

    const progress = await prisma.userSheetProgress.findUnique({
      where: { userId_sheetId: { userId, sheetId: sheet.id } },
    });
    if (!progress) throw new ApiError(404, "NOT_FOUND", "Start the sheet first");

    const topicInSheet = await prisma.sheetTopic.findUnique({
      where: { sheetId_topicId: { sheetId: sheet.id, topicId } },
    });
    if (!topicInSheet) throw new ApiError(400, "VALIDATION_FAILED", "Topic is not part of this sheet", "topicId");

    const nextTopic = await prisma.sheetTopic.findFirst({
      where: { sheetId: sheet.id, position: { gt: topicInSheet.position } },
      orderBy: { position: "asc" },
    });

    const updated = await prisma.userSheetProgress.update({
      where: { id: progress.id },
      data: {
        currentTopicId: nextTopic?.topicId ?? null,
        status: nextTopic ? "IN_PROGRESS" : "COMPLETED",
        completedAt: nextTopic ? null : new Date(),
      },
    });

    sendOk(res, { progress: updated });
  },
);

export default router;
