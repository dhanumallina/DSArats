import { Router } from "express";
import { streakQuerySchema } from "@dsarats/shared";
import type { StreakQuery } from "@dsarats/shared";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { getStreakResponse, getUserTimezone } from "../services/streak.service";
import { sendOk } from "../utils/response";

const router = Router();
router.use(requireAuth);

/** GET /streak — current/longest streak plus the requested month's activity calendar. */
router.get("/", validate({ query: streakQuerySchema }), async (req: AuthedRequest, res) => {
  const { month } = req.query as unknown as StreakQuery;
  const userId = req.user!.id;
  const timezone = await getUserTimezone(userId);
  sendOk(res, await getStreakResponse(userId, timezone, month));
});

export default router;
