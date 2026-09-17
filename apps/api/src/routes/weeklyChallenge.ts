import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { getUserTimezone } from "../services/streak.service";
import { getWeeklyChallenge } from "../services/weeklyChallenge.service";
import { sendOk } from "../utils/response";

const router = Router();
router.use(requireAuth);

/** GET /weekly-challenge — this week's shared set plus the viewer's own progress. */
router.get("/", async (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  sendOk(res, await getWeeklyChallenge(userId, await getUserTimezone(userId)));
});

export default router;
