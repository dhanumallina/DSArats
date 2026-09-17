import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { getAnalytics } from "../services/analytics.service";
import { getReadiness } from "../services/readiness.service";
import { getUserTimezone } from "../services/streak.service";
import { sendOk } from "../utils/response";

const router = Router();
router.use(requireAuth);

/** GET /analytics — every chart on the analytics page, in one payload. */
router.get("/", async (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  sendOk(res, await getAnalytics(userId, await getUserTimezone(userId)));
});

/** GET /analytics/readiness — the estimate alone, with its factors and disclaimer. */
router.get("/readiness", async (req: AuthedRequest, res) => {
  sendOk(res, await getReadiness(req.user!.id));
});

export default router;
