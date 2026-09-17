import { Router } from "express";
import { leaderboardQuerySchema } from "@dsarats/shared";
import type { LeaderboardQuery } from "@dsarats/shared";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { getLeaderboard } from "../services/leaderboard.service";
import { sendOk } from "../utils/response";

const router = Router();
router.use(requireAuth);

/**
 * GET /leaderboards — learners who published their profile, ranked on real activity.
 *
 * Authenticated rather than public: the board is a feature of the app, and requiring a
 * session keeps anonymous scraping of handles off the table.
 */
router.get("/", validate({ query: leaderboardQuerySchema }), async (req: AuthedRequest, res) => {
  const { metric } = req.query as unknown as LeaderboardQuery;
  sendOk(res, await getLeaderboard(metric, req.user!.id));
});

export default router;
