import { Router } from "express";
import { z } from "zod";
import {
  revisionCompleteSchema,
  revisionHistoryQuerySchema,
  revisionQuerySchema,
} from "@dsarats/shared";
import type { RevisionCompleteInput, RevisionHistoryQuery, RevisionQuery } from "@dsarats/shared";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { completeRevision, getRevisionHistory, getRevisionQueue } from "../services/revision.service";
import { sendOk } from "../utils/response";

const router = Router();
router.use(requireAuth);

const problemIdParamsSchema = z.object({ problemId: z.string().uuid() });

/** GET /revision — due-today queue by default; `?due=false` returns the whole schedule. */
router.get("/", validate({ query: revisionQuerySchema }), async (req: AuthedRequest, res) => {
  const { due } = req.query as unknown as RevisionQuery;
  sendOk(res, await getRevisionQueue(req.user!.id, { due }));
});

/** GET /revision/history — completed revisions, newest first. */
router.get(
  "/history",
  validate({ query: revisionHistoryQuerySchema }),
  async (req: AuthedRequest, res) => {
    const query = req.query as unknown as RevisionHistoryQuery;
    sendOk(res, await getRevisionHistory(req.user!.id, query));
  },
);

/** POST /revision/:problemId/complete — advance the schedule and mark the problem revised. */
router.post(
  "/:problemId/complete",
  validate({ params: problemIdParamsSchema, body: revisionCompleteSchema }),
  async (req: AuthedRequest, res) => {
    const { problemId } = req.params as z.infer<typeof problemIdParamsSchema>;
    const { difficultyAfterRevision } = req.body as RevisionCompleteInput;
    sendOk(res, await completeRevision(req.user!.id, problemId, difficultyAfterRevision));
  },
);

export default router;
