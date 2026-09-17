import { Router } from "express";
import { z } from "zod";
import { noteUpsertSchema, problemProgressSchema, problemsQuerySchema } from "@dsarats/shared";
import type { NoteUpsertInput, ProblemProgressInput } from "@dsarats/shared";
import { ApiError } from "../services/auth.service";
import { optionalAuth, requireAuth, type AuthedRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { getProblemDetail, listProblems } from "../services/problem.service";
import { setProblemStatus } from "../services/progress.service";
import { getNote, upsertNote } from "../services/note.service";
import { sendOk } from "../utils/response";

const router = Router();

const idParamsSchema = z.object({ id: z.string().uuid() });

/** GET /problems — search, filter, sort, paginate. Public (published only). */
router.get("/", validate({ query: problemsQuerySchema }), async (req, res) => {
  const query = problemsQuerySchema.parse(req.query);
  const result = await listProblems(query);
  sendOk(res, result);
});

/** GET /problems/:id — detail + related problems + the viewer's own progress. */
router.get("/:id", optionalAuth, validate({ params: idParamsSchema }), async (req: AuthedRequest, res) => {
  const { id } = req.params as z.infer<typeof idParamsSchema>;
  const result = await getProblemDetail(id, req.user?.id);
  if (!result) throw new ApiError(404, "NOT_FOUND", "Problem not found");
  sendOk(res, result);
});

/** GET /problems/:id/notes — the viewer's notebook entry, or null when none exists. */
router.get("/:id/notes", requireAuth, validate({ params: idParamsSchema }), async (req: AuthedRequest, res) => {
  const { id } = req.params as z.infer<typeof idParamsSchema>;
  sendOk(res, await getNote(req.user!.id, id));
});

/**
 * PUT /problems/:id/notes — create or partially update the notebook entry.
 * Autosave-friendly: omitted fields are untouched, null clears a field.
 */
router.put(
  "/:id/notes",
  requireAuth,
  validate({ params: idParamsSchema, body: noteUpsertSchema }),
  async (req: AuthedRequest, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    sendOk(res, await upsertNote(req.user!.id, id, req.body as NoteUpsertInput));
  },
);

/**
 * PATCH /problems/:id/progress — set the user's status for a problem.
 *
 * Status, activity log, and streak update atomically; safe to retry with the same
 * status (no duplicate activity or inflated counts).
 */
router.patch(
  "/:id/progress",
  requireAuth,
  validate({ params: idParamsSchema, body: problemProgressSchema }),
  async (req: AuthedRequest, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const { status } = req.body as ProblemProgressInput;
    sendOk(res, await setProblemStatus(req.user!.id, id, status));
  },
);

export default router;
