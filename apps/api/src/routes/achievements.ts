import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { getAchievements } from "../services/gamification.service";
import { sendOk } from "../utils/response";

const router = Router();
router.use(requireAuth);

/** GET /achievements — the catalogue with this user's progress and unlock state. */
router.get("/", async (req: AuthedRequest, res) => {
  sendOk(res, await getAchievements(req.user!.id));
});

export default router;
