import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { getXpSummary } from "../services/gamification.service";
import { sendOk } from "../utils/response";

const router = Router();
router.use(requireAuth);

/** GET /xp — XP total, level, and the breakdown it was earned from. */
router.get("/", async (req: AuthedRequest, res) => {
  sendOk(res, await getXpSummary(req.user!.id));
});

export default router;
