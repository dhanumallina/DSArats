import { Router } from "express";
import { z } from "zod";
import {
  adminProblemCreateSchema,
  adminProblemUpdateSchema,
  adminSheetCreateSchema,
  adminSheetProblemSchema,
  adminSheetTopicsSchema,
  adminSheetUpdateSchema,
  adminTopicCreateSchema,
  adminTopicUpdateSchema,
} from "@dsarats/shared";
import { ApiError } from "../services/auth.service";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { prisma } from "../db";
import { sendOk } from "../utils/response";

const router = Router();
// requireAuth must run first — requireAdmin only inspects req.user, which requireAuth sets.
router.use(requireAuth, requireAdmin);

const idParamsSchema = z.object({ id: z.string().uuid() });

// ── Sheets ───────────────────────────────────────────────────────────────────

/** POST /admin/sheets */
router.post("/sheets", validate({ body: adminSheetCreateSchema }), async (req, res) => {
  const data = adminSheetCreateSchema.parse(req.body);
  const sheet = await prisma.dSASheet.create({ data });
  sendOk(res, { sheet }, 201);
});

/** PATCH /admin/sheets/:id */
router.patch("/sheets/:id", validate({ params: idParamsSchema, body: adminSheetUpdateSchema }), async (req, res) => {
  const { id } = req.params as z.infer<typeof idParamsSchema>;
  const data = adminSheetUpdateSchema.parse(req.body);
  const existing = await prisma.dSASheet.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Sheet not found");
  const sheet = await prisma.dSASheet.update({ where: { id }, data });
  sendOk(res, { sheet });
});

/** POST /admin/sheets/:id/topics — replace a sheet's topic ordering. */
router.post(
  "/sheets/:id/topics",
  validate({ params: idParamsSchema, body: adminSheetTopicsSchema }),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const { topicSlugs } = adminSheetTopicsSchema.parse(req.body);

    const sheet = await prisma.dSASheet.findUnique({ where: { id } });
    if (!sheet) throw new ApiError(404, "NOT_FOUND", "Sheet not found");

    await prisma.sheetTopic.deleteMany({ where: { sheetId: id } });

    let position = 0;
    for (const slug of topicSlugs) {
      const topic = await prisma.topic.findUnique({ where: { slug } });
      if (!topic) throw new ApiError(400, "VALIDATION_FAILED", `Unknown topic: ${slug}`, "topicSlugs");
      await prisma.sheetTopic.create({ data: { sheetId: id, topicId: topic.id, position } });
      position++;
    }

    sendOk(res, { topics: topicSlugs.length });
  },
);

/** POST /admin/sheets/:id/problems — add a problem to the sheet. */
router.post(
  "/sheets/:id/problems",
  validate({ params: idParamsSchema, body: adminSheetProblemSchema }),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const { problemId, position, isCore } = adminSheetProblemSchema.parse(req.body);

    const [sheet, problem] = await Promise.all([
      prisma.dSASheet.findUnique({ where: { id } }),
      prisma.problem.findUnique({ where: { id: problemId } }),
    ]);
    if (!sheet) throw new ApiError(404, "NOT_FOUND", "Sheet not found");
    if (!problem) throw new ApiError(404, "NOT_FOUND", "Problem not found");

    try {
      const sp = await prisma.sheetProblem.create({
        data: { sheetId: id, problemId, position, isCore },
      });
      sendOk(res, { sheetProblem: sp }, 201);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Unique constraint")) {
        throw new ApiError(409, "CONFLICT", "Problem already in sheet at that position");
      }
      throw err;
    }
  },
);

// ── Topics ───────────────────────────────────────────────────────────────────

/** POST /admin/topics */
router.post("/topics", validate({ body: adminTopicCreateSchema }), async (req, res) => {
  const data = adminTopicCreateSchema.parse(req.body);
  const topic = await prisma.topic.create({ data });
  sendOk(res, { topic }, 201);
});

/** PATCH /admin/topics/:id */
router.patch("/topics/:id", validate({ params: idParamsSchema, body: adminTopicUpdateSchema }), async (req, res) => {
  const { id } = req.params as z.infer<typeof idParamsSchema>;
  const data = adminTopicUpdateSchema.parse(req.body);
  const existing = await prisma.topic.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Topic not found");
  const topic = await prisma.topic.update({ where: { id }, data });
  sendOk(res, { topic });
});

// ── Problems ─────────────────────────────────────────────────────────────────

/** POST /admin/problems */
router.post("/problems", validate({ body: adminProblemCreateSchema }), async (req, res) => {
  const data = adminProblemCreateSchema.parse(req.body);

  const topic = await prisma.topic.findUnique({ where: { slug: data.topicSlug } });
  if (!topic) throw new ApiError(400, "VALIDATION_FAILED", `Unknown topic: ${data.topicSlug}`, "topicSlug");

  const { topicSlug: _topicSlug, ...rest } = data;
  try {
    const problem = await prisma.problem.create({ data: { ...rest, topicId: topic.id } });
    sendOk(res, { problem }, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      throw new ApiError(409, "CONFLICT", "Problem slug already exists", "slug");
    }
    throw err;
  }
});

/** PATCH /admin/problems/:id */
router.patch("/problems/:id", validate({ params: idParamsSchema, body: adminProblemUpdateSchema }), async (req, res) => {
  const { id } = req.params as z.infer<typeof idParamsSchema>;
  const data = adminProblemUpdateSchema.parse(req.body);

  const existing = await prisma.problem.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Problem not found");

  const { topicSlug, ...rest } = data;
  let topicId: string | undefined;
  if (topicSlug) {
    const topic = await prisma.topic.findUnique({ where: { slug: topicSlug } });
    if (!topic) throw new ApiError(400, "VALIDATION_FAILED", `Unknown topic: ${topicSlug}`, "topicSlug");
    topicId = topic.id;
  }

  const problem = await prisma.problem.update({
    where: { id },
    data: { ...rest, ...(topicId ? { topicId } : {}) },
  });
  sendOk(res, { problem });
});

/** DELETE /admin/problems/:id — soft-hide (unpublish) rather than hard delete. */
router.delete("/problems/:id", validate({ params: idParamsSchema }), async (req, res) => {
  const { id } = req.params as z.infer<typeof idParamsSchema>;
  const existing = await prisma.problem.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Problem not found");
  await prisma.problem.update({ where: { id }, data: { isPublished: false } });
  res.status(204).end();
});

export default router;