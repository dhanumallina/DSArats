import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { sendOk } from "../utils/response";
import { validate } from "../middleware/validate";

const router = Router();

const slugParamsSchema = z.object({ slug: z.string().min(1).max(80) });

/** GET /topics — all topics with published problem counts. */
router.get("/", async (_req, res) => {
  const topics = await prisma.topic.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      order: true,
      iconKey: true,
      _count: { select: { problems: { where: { isPublished: true } } } },
    },
  });
  sendOk(res, { topics });
});

/** GET /topics/:slug/problems — problems in a topic. */
router.get("/:slug/problems", validate({ params: slugParamsSchema }), async (req, res) => {
  const { slug } = req.params as z.infer<typeof slugParamsSchema>;
  const topic = await prisma.topic.findUnique({
    where: { slug },
    include: {
      problems: {
        where: { isPublished: true },
        orderBy: { difficulty: "asc" },
        select: {
          id: true,
          slug: true,
          title: true,
          difficulty: true,
          pattern: true,
          platformProblemUrl: true,
          estimatedMinutes: true,
        },
      },
    },
  });
  if (!topic) {
    sendOk(res, { topic: null, problems: [] });
    return;
  }
  sendOk(res, {
    topic: { id: topic.id, slug: topic.slug, name: topic.name, description: topic.description },
    problems: topic.problems,
  });
});

export default router;