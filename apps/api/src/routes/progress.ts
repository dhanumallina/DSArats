import { Router } from "express";
import { heatmapQuerySchema } from "@dsarats/shared";
import type { HeatmapQuery } from "@dsarats/shared";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { getActivityHeatmap, getProgressSummary } from "../services/progress.service";
import { getUserTimezone } from "../services/streak.service";
import { sendOk } from "../utils/response";

const router = Router();
router.use(requireAuth);

/** GET /progress — progress summary by topic, sheet, difficulty, and status. */
router.get("/", async (req: AuthedRequest, res) => {
  sendOk(res, await getProgressSummary(req.user!.id));
});

/** GET /progress/heatmap — per-day activity for a year (defaults to the current local year). */
router.get("/heatmap", validate({ query: heatmapQuerySchema }), async (req: AuthedRequest, res) => {
  const { year } = req.query as unknown as HeatmapQuery;
  const userId = req.user!.id;
  const timezone = await getUserTimezone(userId);
  sendOk(res, await getActivityHeatmap(userId, timezone, year));
});

export default router;
