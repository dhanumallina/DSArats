import { Router } from "express";
import { z } from "zod";
import { problemsQuerySchema } from "@dsarats/shared";
import { ApiError } from "../services/auth.service";
import { validate } from "../middleware/validate";
import { getProblemDetail, listProblems } from "../services/problem.service";
import { sendOk } from "../utils/response";

const router = Router();

const idParamsSchema = z.object({ id: z.string().uuid() });

/** GET /problems — search, filter, sort, paginate. Public (published only). */
router.get("/", validate({ query: problemsQuerySchema }), async (req, res) => {
  const query = problemsQuerySchema.parse(req.query);
  const result = await listProblems(query);
  sendOk(res, result);
});

/** GET /problems/:id — detail + related problems. */
router.get("/:id", validate({ params: idParamsSchema }), async (req, res) => {
  const { id } = req.params as z.infer<typeof idParamsSchema>;
  const result = await getProblemDetail(id);
  if (!result) throw new ApiError(404, "NOT_FOUND", "Problem not found");
  sendOk(res, result);
});

export default router;