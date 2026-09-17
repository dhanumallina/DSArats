import { Router } from "express";
import {
  dailyChallengeCompleteSchema,
  dailyChallengeHistoryQuerySchema,
  dailyChallengeQuerySchema,
} from "@dsarats/shared";
import type {
  DailyChallengeCompleteInput,
  DailyChallengeHistoryQuery,
  DailyChallengeQuery,
} from "@dsarats/shared";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  completeChallenge,
  getChallengeHistory,
  getTodayChallenge,
} from "../services/dailyChallenge.service";
import { sendOk } from "../utils/response";

const router = Router();
router.use(requireAuth);

/** GET /daily-challenge — today's challenge (created on first request) + own completion. */
router.get("/", validate({ query: dailyChallengeQuerySchema }), async (req: AuthedRequest, res) => {
  const options = req.query as unknown as DailyChallengeQuery;
  sendOk(res, await getTodayChallenge(req.user!.id, options));
});

/** POST /daily-challenge/complete — mark today's challenge SOLVED | ATTEMPTED | SKIPPED. */
router.post("/complete", validate({ body: dailyChallengeCompleteSchema }), async (req: AuthedRequest, res) => {
  const { status } = req.body as DailyChallengeCompleteInput;
  sendOk(res, await completeChallenge(req.user!.id, status));
});

/** GET /daily-challenge/history — past challenges the user marked, newest first. */
router.get("/history", validate({ query: dailyChallengeHistoryQuerySchema }), async (req: AuthedRequest, res) => {
  const query = req.query as unknown as DailyChallengeHistoryQuery;
  sendOk(res, await getChallengeHistory(req.user!.id, query));
});

export default router;
