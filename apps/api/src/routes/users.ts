import { Router } from "express";
import { updateProfileSchema } from "@dsarats/shared";
import type { UpdateProfileInput } from "@dsarats/shared";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { prisma } from "../db";
import { ApiError, toPublicUser, updateProfile, userWithProfile } from "../services/auth.service";
import { sendOk } from "../utils/response";

const router = Router();
router.use(requireAuth);

/** GET /users/me/profile — the authenticated user's own profile (also on GET /auth/me). */
router.get("/me/profile", async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: userWithProfile,
  });
  if (!user) throw new ApiError(404, "NOT_FOUND", "User not found");
  sendOk(res, { user: toPublicUser(user) });
});

/** PATCH /users/me/profile — partial update. Omitted fields are untouched; null clears. */
router.patch(
  "/me/profile",
  validate({ body: updateProfileSchema }),
  async (req: AuthedRequest, res) => {
    sendOk(res, { user: await updateProfile(req.user!.id, req.body as UpdateProfileInput) });
  },
);

export default router;
