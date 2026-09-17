import { Router } from "express";
import { z } from "zod";
import { createStudyGroupSchema } from "@dsarats/shared";
import type { CreateStudyGroupInput } from "@dsarats/shared";
import { optionalAuth, requireAuth, type AuthedRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createGroup,
  getCommunityActivity,
  getGroupDetail,
  joinGroup,
  leaveGroup,
  listGroups,
} from "../services/community.service";
import { sendOk } from "../utils/response";

const router = Router();

const groupParamsSchema = z.object({ groupId: z.string().uuid() });

/** GET /community/activity — recent activity from learners who published a profile. */
router.get("/activity", optionalAuth, async (_req: AuthedRequest, res) => {
  sendOk(res, await getCommunityActivity());
});

/** GET /community/groups — public groups, plus the viewer's own private ones. */
router.get("/groups", optionalAuth, async (req: AuthedRequest, res) => {
  sendOk(res, await listGroups(req.user?.id));
});

/** POST /community/groups — create a group, with the creator as owner. */
router.post(
  "/groups",
  requireAuth,
  validate({ body: createStudyGroupSchema }),
  async (req: AuthedRequest, res) => {
    const created = await createGroup(req.user!.id, req.body as CreateStudyGroupInput);
    sendOk(res, created, 201);
  },
);

/** GET /community/groups/:groupId — detail and members (private groups: members only). */
router.get(
  "/groups/:groupId",
  optionalAuth,
  validate({ params: groupParamsSchema }),
  async (req: AuthedRequest, res) => {
    const { groupId } = req.params as z.infer<typeof groupParamsSchema>;
    sendOk(res, await getGroupDetail(groupId, req.user?.id));
  },
);

/** POST /community/groups/:groupId/join — join a public group. Re-joining is a no-op. */
router.post(
  "/groups/:groupId/join",
  requireAuth,
  validate({ params: groupParamsSchema }),
  async (req: AuthedRequest, res) => {
    const { groupId } = req.params as z.infer<typeof groupParamsSchema>;
    sendOk(res, await joinGroup(req.user!.id, groupId));
  },
);

/** POST /community/groups/:groupId/leave — leave a group you do not own. */
router.post(
  "/groups/:groupId/leave",
  requireAuth,
  validate({ params: groupParamsSchema }),
  async (req: AuthedRequest, res) => {
    const { groupId } = req.params as z.infer<typeof groupParamsSchema>;
    sendOk(res, await leaveGroup(req.user!.id, groupId));
  },
);

export default router;
