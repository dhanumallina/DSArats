import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { getDashboard } from "../services/dashboard.service";
import { sendOk } from "../utils/response";

const router = Router();
router.use(requireAuth);

/** GET /dashboard — single aggregate payload for the web dashboard (plan §5.5). */
router.get("/", async (req: AuthedRequest, res) => {
  sendOk(res, await getDashboard(req.user!.id));
});

export default router;
