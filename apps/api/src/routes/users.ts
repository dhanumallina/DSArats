import { Router } from "express";
import { z } from "zod";
import { publicProfileParamsSchema, updateProfileSchema } from "@dsarats/shared";
import type { UpdateProfileInput } from "@dsarats/shared";
import { optionalAuth, requireAuth, type AuthedRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { prisma } from "../db";
import { ApiError, toPublicUser, updateProfile, userWithProfile } from "../services/auth.service";
import { getPublicProfile } from "../services/publicProfile.service";
import { sendOk } from "../utils/response";

const router = Router();

/** GET /users/me/profile — the authenticated user's own profile (also on GET /auth/me). */
router.get("/me/profile", requireAuth, async (req: AuthedRequest, res) => {
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
  requireAuth,
  validate({ body: updateProfileSchema }),
  async (req: AuthedRequest, res) => {
    sendOk(res, { user: await updateProfile(req.user!.id, req.body as UpdateProfileInput) });
  },
);

/**
 * GET /users/:username — a published profile's safe projection.
 *
 * Public, but only for profiles whose owner opted in: a private profile is reported as
 * not-found to everyone except its owner. Declared after the `/me` routes so the static
 * paths can never be shadowed.
 */
router.get(
  "/:username",
  optionalAuth,
  validate({ params: publicProfileParamsSchema }),
  async (req: AuthedRequest, res) => {
    const { username } = req.params as z.infer<typeof publicProfileParamsSchema>;
    sendOk(res, await getPublicProfile(username, req.user?.id));
  },
);

export default router;
