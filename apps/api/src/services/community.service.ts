import type { ActivityType, Prisma } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";
import type {
  CommunityActivityItemDto,
  CommunityActivityResponse,
  CreateStudyGroupInput,
  GroupMemberDto,
  GroupRole,
  StudyGroupDetailResponse,
  StudyGroupDto,
  StudyGroupResponse,
  StudyGroupsResponse,
} from "@dsarats/shared";
import { prisma } from "../db";
import { ApiError } from "./auth.service";

/** How many groups and activity rows the community page shows. */
const GROUP_LIMIT = 50;
const ACTIVITY_LIMIT = 20;

/** Activity types that are shareable, in the sense of not being private working notes. */
const PUBLIC_ACTIVITY_TYPES: ActivityType[] = [
  "PROBLEM_SOLVED",
  "PROBLEM_ATTEMPTED",
  "REVISION_COMPLETED",
  "DAILY_CHALLENGE",
];

/** Activity types whose `refId` is a problem id. */
const PROBLEM_REF_TYPES = new Set<ActivityType>([
  "PROBLEM_SOLVED",
  "PROBLEM_ATTEMPTED",
  "REVISION_COMPLETED",
]);

const groupInclude = {
  createdBy: { select: { profile: { select: { username: true, displayName: true } } } },
  _count: { select: { members: true } },
} as const;

type GroupRow = Prisma.StudyGroupGetPayload<{ include: typeof groupInclude }>;

function toGroupDto(group: GroupRow, viewerRole: GroupRole | null): StudyGroupDto {
  const creator = group.createdBy.profile;

  return {
    id: group.id,
    slug: group.slug,
    name: group.name,
    description: group.description,
    visibility: group.visibility,
    memberCount: group._count.members,
    createdAt: group.createdAt.toISOString(),
    createdBy: creator ? { username: creator.username, displayName: creator.displayName } : null,
    joined: viewerRole !== null,
    viewerRole,
  };
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base.length >= 3 ? base : `group-${base}`.replace(/-+$/, "");
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof PrismaNamespace.PrismaClientKnownRequestError && error.code === "P2002";
}

/** The viewer's role per group, in one query rather than one per row. */
async function rolesForViewer(
  viewerId: string | undefined,
  groupIds: string[],
): Promise<Map<string, GroupRole>> {
  if (!viewerId || groupIds.length === 0) return new Map();

  const rows = await prisma.groupMember.findMany({
    where: { userId: viewerId, groupId: { in: groupIds } },
    select: { groupId: true, role: true },
  });
  return new Map(rows.map((row) => [row.groupId, row.role]));
}

/**
 * Create a group, with the creator as its owner.
 *
 * The URL slug is derived from the name. Two groups may legitimately share a name, so a
 * collision retries with a short suffix instead of failing the request.
 */
export async function createGroup(
  userId: string,
  input: CreateStudyGroupInput,
): Promise<StudyGroupResponse> {
  const base = slugify(input.name);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${randomSuffix()}`;

    try {
      const created = await prisma.studyGroup.create({
        data: {
          slug,
          name: input.name,
          description: input.description ?? null,
          visibility: input.visibility,
          createdById: userId,
          members: { create: { userId, role: "OWNER" } },
        },
        include: groupInclude,
      });
      return { group: toGroupDto(created, "OWNER") };
    } catch (error) {
      if (isUniqueViolation(error)) continue;
      throw error;
    }
  }

  throw new ApiError(
    409,
    "CONFLICT",
    "That group name is crowded right now — try a slightly different one",
    "name",
  );
}

function randomSuffix(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 4);
}

/**
 * Groups the viewer may know about: every public group, plus their own private ones.
 *
 * A private group is invite-only, so listing it to non-members would defeat the setting.
 */
export async function listGroups(viewerId?: string): Promise<StudyGroupsResponse> {
  const where: Prisma.StudyGroupWhereInput = viewerId
    ? { OR: [{ visibility: "PUBLIC" }, { members: { some: { userId: viewerId } } }] }
    : { visibility: "PUBLIC" };

  const groups = await prisma.studyGroup.findMany({
    where,
    include: groupInclude,
    orderBy: { createdAt: "desc" },
    take: GROUP_LIMIT,
  });

  const roles = await rolesForViewer(
    viewerId,
    groups.map((group) => group.id),
  );

  return {
    groups: groups.map((group) => toGroupDto(group, roles.get(group.id) ?? null)),
  };
}

/**
 * A group's detail and members.
 *
 * A private group is reported as not-found to non-members — the same response as a group
 * that does not exist, so membership cannot be probed.
 */
export async function getGroupDetail(
  groupId: string,
  viewerId?: string,
): Promise<StudyGroupDetailResponse> {
  const group = await prisma.studyGroup.findUnique({ where: { id: groupId }, include: groupInclude });
  if (!group) throw new ApiError(404, "NOT_FOUND", "Group not found");

  const roles = await rolesForViewer(viewerId, [group.id]);
  const viewerRole = roles.get(group.id) ?? null;

  if (group.visibility === "PRIVATE" && viewerRole === null) {
    throw new ApiError(404, "NOT_FOUND", "Group not found");
  }

  const members = await prisma.groupMember.findMany({
    where: { groupId: group.id },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    select: {
      role: true,
      joinedAt: true,
      user: { select: { profile: { select: { username: true, displayName: true, avatarUrl: true } } } },
    },
  });

  return {
    group: toGroupDto(group, viewerRole),
    members: members
      .filter((member) => member.user.profile !== null)
      .map<GroupMemberDto>((member) => ({
        username: member.user.profile!.username,
        displayName: member.user.profile!.displayName,
        avatarUrl: member.user.profile!.avatarUrl,
        role: member.role,
        joinedAt: member.joinedAt.toISOString(),
      })),
  };
}

/** Join a public group. Re-joining is a no-op rather than an error. */
export async function joinGroup(userId: string, groupId: string): Promise<StudyGroupResponse> {
  const group = await prisma.studyGroup.findUnique({
    where: { id: groupId },
    select: { id: true, visibility: true },
  });

  // Invite-only groups are not joinable, and are reported as missing rather than forbidden.
  if (!group || group.visibility === "PRIVATE") {
    throw new ApiError(404, "NOT_FOUND", "Group not found");
  }

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId, userId } },
    // `update: {}` keeps an existing membership — including an owner's role — untouched.
    create: { groupId, userId, role: "MEMBER" },
    update: {},
  });

  const detail = await getGroupDetail(groupId, userId);
  return { group: detail.group };
}

/** Leave a group. Leaving when not a member is a no-op. */
export async function leaveGroup(userId: string, groupId: string): Promise<StudyGroupResponse> {
  const group = await prisma.studyGroup.findUnique({
    where: { id: groupId },
    select: { id: true, visibility: true },
  });
  if (!group) throw new ApiError(404, "NOT_FOUND", "Group not found");

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { role: true },
  });

  if (group.visibility === "PRIVATE" && !membership) {
    throw new ApiError(404, "NOT_FOUND", "Group not found");
  }

  // An owner leaving would strand the group with nobody able to run it, and there is no
  // transfer or delete flow yet — so this is refused explicitly rather than silently
  // orphaning the group.
  if (membership?.role === "OWNER") {
    throw new ApiError(
      409,
      "CONFLICT",
      "You own this group, so you can't leave it",
    );
  }

  if (membership) {
    await prisma.groupMember.delete({ where: { groupId_userId: { groupId, userId } } });
  }

  const detail = await getGroupDetail(groupId, userId);
  return { group: detail.group };
}

/**
 * Recent activity from learners who published their profile.
 *
 * Activity is not a side door into private progress: only published profiles appear, and
 * only shareable activity types are read — notebook writes are never surfaced.
 */
export async function getCommunityActivity(): Promise<CommunityActivityResponse> {
  const rows = await prisma.activityLog.findMany({
    where: {
      type: { in: PUBLIC_ACTIVITY_TYPES },
      user: { is: { profile: { is: { visibility: "PUBLIC" } } } },
    },
    orderBy: { occurredAt: "desc" },
    take: ACTIVITY_LIMIT,
    select: {
      type: true,
      refId: true,
      occurredAt: true,
      user: {
        select: { profile: { select: { username: true, displayName: true, avatarUrl: true } } },
      },
    },
  });

  const problemIds = rows
    .filter((row) => row.refId && PROBLEM_REF_TYPES.has(row.type))
    .map((row) => row.refId!);
  const challengeIds = rows
    .filter((row) => row.refId && row.type === "DAILY_CHALLENGE")
    .map((row) => row.refId!);

  // Two batched lookups instead of a query per row.
  const [problems, challenges] = await Promise.all([
    problemIds.length > 0
      ? prisma.problem.findMany({
          where: { id: { in: problemIds } },
          select: { id: true, title: true },
        })
      : Promise.resolve([]),
    challengeIds.length > 0
      ? prisma.dailyChallenge.findMany({
          where: { id: { in: challengeIds } },
          select: { id: true, problem: { select: { title: true } } },
        })
      : Promise.resolve([]),
  ]);

  const titleByProblem = new Map(problems.map((problem) => [problem.id, problem.title]));
  const titleByChallenge = new Map(challenges.map((row) => [row.id, row.problem.title]));

  const items = rows
    .filter((row) => row.user.profile !== null)
    .map<CommunityActivityItemDto>((row) => ({
      username: row.user.profile!.username,
      displayName: row.user.profile!.displayName,
      avatarUrl: row.user.profile!.avatarUrl,
      type: row.type,
      problemTitle:
        row.refId === null
          ? null
          : PROBLEM_REF_TYPES.has(row.type)
            ? titleByProblem.get(row.refId) ?? null
            : titleByChallenge.get(row.refId) ?? null,
      occurredAt: row.occurredAt.toISOString(),
    }));

  return { items };
}
