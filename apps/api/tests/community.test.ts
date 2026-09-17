import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { ACHIEVEMENTS, COOKIE_NAMES } from "@dsarats/shared";
import { createApp } from "../src/app";
import { prisma } from "../src/db";

const app = createApp();

const unique = Date.now();
const suffix = unique.toString(36);
const password = "strongpass123";

const alphaEmail = `community-alpha-${unique}@example.com`;
const betaEmail = `community-beta-${unique}@example.com`;
const privateEmail = `community-private-${unique}@example.com`;

const alphaUsername = `com_a_${suffix}`;
const betaUsername = `com_b_${suffix}`;
const privateUsername = `com_p_${suffix}`;

let alphaCookie: string;
let betaCookie: string;
let privateCookie: string;
let problemIds: string[];

function extractCookie(res: request.Response, name: string): string | undefined {
  const header = res.headers["set-cookie"];
  if (!header) return undefined;
  const list = Array.isArray(header) ? header : [header];
  const found = list.find((c) => c.startsWith(`${name}=`));
  return found?.split(";")[0];
}

async function register(email: string, username: string): Promise<string> {
  await request(app)
    .post("/api/v1/auth/register")
    .send({ email, password, confirmPassword: password, username });
  const login = await request(app).post("/api/v1/auth/login").send({ email, password });
  return extractCookie(login, COOKIE_NAMES.ACCESS)!;
}

function setStatus(cookie: string, problemId: string, status: string) {
  return request(app)
    .patch(`/api/v1/problems/${problemId}/progress`)
    .set("Cookie", [cookie])
    .send({ status });
}

function setVisibility(cookie: string, visibility: string) {
  return request(app)
    .patch("/api/v1/users/me/profile")
    .set("Cookie", [cookie])
    .send({ visibility });
}

beforeAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: [alphaEmail, betaEmail, privateEmail] } },
  });

  alphaCookie = await register(alphaEmail, alphaUsername);
  betaCookie = await register(betaEmail, betaUsername);
  privateCookie = await register(privateEmail, privateUsername);

  const list = await request(app).get("/api/v1/problems").query({ limit: 6 });
  problemIds = (list.body.data.items as Array<{ id: string }>).map((item) => item.id);

  // Activity so the boards and aggregates have real numbers: the private learner has the
  // most solved, so excluding them from public surfaces is a meaningful assertion.
  for (const problemId of problemIds.slice(0, 3)) {
    await setStatus(privateCookie, problemId, "SOLVED");
  }
  await setStatus(alphaCookie, problemIds[3]!, "SOLVED");
  await setStatus(alphaCookie, problemIds[4]!, "SOLVED");
  await setStatus(betaCookie, problemIds[5]!, "SOLVED");
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: [alphaEmail, betaEmail, privateEmail] } },
  });
  await prisma.$disconnect();
});

describe("profile visibility", () => {
  it("hides a profile from everyone but its owner by default", async () => {
    const anonymous = await request(app).get(`/api/v1/users/${alphaUsername}`);
    expect(anonymous.status).toBe(404);
    expect(anonymous.body.error.code).toBe("NOT_FOUND");

    // Another signed-in learner gets the same answer as a stranger.
    const peer = await request(app)
      .get(`/api/v1/users/${alphaUsername}`)
      .set("Cookie", [betaCookie]);
    expect(peer.status).toBe(404);
  });

  it("lets the owner read their own private profile", async () => {
    const res = await request(app)
      .get(`/api/v1/users/${alphaUsername}`)
      .set("Cookie", [alphaCookie]);

    expect(res.status).toBe(200);
    expect(res.body.data.profile.isSelf).toBe(true);
    expect(res.body.data.profile.visibility).toBe("PRIVATE");
  });

  it("publishes the profile once the owner opts in", async () => {
    const patched = await setVisibility(alphaCookie, "PUBLIC");
    expect(patched.status).toBe(200);
    expect(patched.body.data.user.profile.visibility).toBe("PUBLIC");

    const anonymous = await request(app).get(`/api/v1/users/${alphaUsername}`);
    expect(anonymous.status).toBe(200);
    expect(anonymous.body.data.profile.username).toBe(alphaUsername);
    expect(anonymous.body.data.profile.isSelf).toBe(false);
  });

  it("rejects an unknown visibility value", async () => {
    const res = await setVisibility(alphaCookie, "FRIENDS");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("exposes counts and shared fields only — never email, timezone, or notes", async () => {
    const res = await request(app).get(`/api/v1/users/${alphaUsername}`);
    const body = JSON.stringify(res.body);

    expect(body).not.toContain(alphaEmail);
    expect(body).not.toContain("timezone");
    expect(body).not.toContain("passwordHash");
    expect(body).not.toContain("revisionNotes");

    const profile = res.body.data.profile;
    expect(Object.keys(profile).sort()).toEqual(
      ["avatarUrl", "bio", "displayName", "isSelf", "joinedAt", "stats", "username", "visibility"].sort(),
    );
    // The aggregates are the learner's real numbers, not placeholders.
    expect(profile.stats.solved).toBe(2);
    expect(profile.stats.achievementsTotal).toBe(ACHIEVEMENTS.length);
    expect(profile.stats.level).toBeGreaterThanOrEqual(1);
    expect(profile.stats.xp).toBeGreaterThan(0);
  });

  it("does not publish a private learner's stats", async () => {
    const res = await request(app).get(`/api/v1/users/${privateUsername}`);
    expect(res.status).toBe(404);
  });
});

describe("leaderboards", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/leaderboards");
    expect(res.status).toBe(401);
  });

  it("ranks published profiles by XP and leaves private learners out", async () => {
    // Beta opts in too, so the board has two ranked learners.
    expect((await setVisibility(betaCookie, "PUBLIC")).status).toBe(200);

    const res = await request(app)
      .get("/api/v1/leaderboards")
      .query({ metric: "xp" })
      .set("Cookie", [alphaCookie]);
    expect(res.status).toBe(200);

    const usernames = (res.body.data.entries as Array<{ username: string }>).map(
      (entry) => entry.username,
    );
    expect(usernames).toContain(alphaUsername);
    expect(usernames).toContain(betaUsername);
    // The private learner solved the most problems, and must not appear.
    expect(usernames).not.toContain(privateUsername);

    const alpha = res.body.data.entries.find(
      (entry: { username: string }) => entry.username === alphaUsername,
    );
    const beta = res.body.data.entries.find(
      (entry: { username: string }) => entry.username === betaUsername,
    );
    // Two solves beats one, whatever else the board holds.
    expect(alpha.value).toBeGreaterThan(beta.value);
    expect(alpha.rank).toBeLessThan(beta.rank);
  });

  it("returns the viewer's own rank and counts the ranked pool", async () => {
    const res = await request(app)
      .get("/api/v1/leaderboards")
      .query({ metric: "solved" })
      .set("Cookie", [alphaCookie]);

    expect(res.body.data.viewer.username).toBe(alphaUsername);
    expect(res.body.data.viewer.isSelf).toBe(true);
    expect(res.body.data.viewer.value).toBe(2);
    expect(res.body.data.rankedProfiles).toBeGreaterThanOrEqual(2);
  });

  it("gives a private viewer no rank rather than exposing one", async () => {
    const res = await request(app)
      .get("/api/v1/leaderboards")
      .query({ metric: "xp" })
      .set("Cookie", [privateCookie]);

    expect(res.status).toBe(200);
    // Opting in is what makes a learner rankable, even for their own view.
    expect(res.body.data.viewer).toBeNull();
    expect(
      (res.body.data.entries as Array<{ username: string }>).some(
        (entry) => entry.username === privateUsername,
      ),
    ).toBe(false);
  });

  it("supports ranking by streak, defaulting to XP", async () => {
    const streak = await request(app)
      .get("/api/v1/leaderboards")
      .query({ metric: "streak" })
      .set("Cookie", [alphaCookie]);
    expect(streak.body.data.metric).toBe("streak");
    expect(streak.body.data.entries[0].value).toBeGreaterThanOrEqual(0);

    const fallback = await request(app).get("/api/v1/leaderboards").set("Cookie", [alphaCookie]);
    expect(fallback.body.data.metric).toBe("xp");

    const invalid = await request(app)
      .get("/api/v1/leaderboards")
      .query({ metric: "vibes" })
      .set("Cookie", [alphaCookie]);
    expect(invalid.status).toBe(400);
  });
});

describe("study groups", () => {
  let publicGroupId: string;
  let privateGroupId: string;

  it("requires authentication to create a group", async () => {
    const res = await request(app).post("/api/v1/community/groups").send({ name: "Nope" });
    expect(res.status).toBe(401);
  });

  it("rejects a too-short name", async () => {
    const res = await request(app)
      .post("/api/v1/community/groups")
      .set("Cookie", [alphaCookie])
      .send({ name: "ab" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("creates a group with the creator as owner and first member", async () => {
    const res = await request(app)
      .post("/api/v1/community/groups")
      .set("Cookie", [alphaCookie])
      .send({ name: `Graph Grinders ${unique}`, description: "Trees and graphs, weekly." });

    expect(res.status).toBe(201);
    expect(res.body.data.group).toMatchObject({
      memberCount: 1,
      visibility: "PUBLIC",
      joined: true,
      viewerRole: "OWNER",
    });
    expect(res.body.data.group.slug).toContain("graph-grinders");
    publicGroupId = res.body.data.group.id;
  });

  it("lists public groups to anonymous visitors", async () => {
    const res = await request(app).get("/api/v1/community/groups");
    expect(res.status).toBe(200);

    const group = (res.body.data.groups as Array<{ id: string; joined: boolean }>).find(
      (row) => row.id === publicGroupId,
    );
    expect(group).toBeDefined();
    // Anonymous callers are never claimed to be members.
    expect(group!.joined).toBe(false);
  });

  it("lets another learner join, and re-joining changes nothing", async () => {
    const joined = await request(app)
      .post(`/api/v1/community/groups/${publicGroupId}/join`)
      .set("Cookie", [betaCookie]);
    expect(joined.status).toBe(200);
    expect(joined.body.data.group.memberCount).toBe(2);
    expect(joined.body.data.group.viewerRole).toBe("MEMBER");

    const again = await request(app)
      .post(`/api/v1/community/groups/${publicGroupId}/join`)
      .set("Cookie", [betaCookie]);
    expect(again.status).toBe(200);
    expect(again.body.data.group.memberCount).toBe(2);
  });

  it("lists the members to a member", async () => {
    const res = await request(app)
      .get(`/api/v1/community/groups/${publicGroupId}`)
      .set("Cookie", [betaCookie]);

    expect(res.status).toBe(200);
    const usernames = (res.body.data.members as Array<{ username: string }>).map(
      (member) => member.username,
    );
    expect(usernames).toEqual([alphaUsername, betaUsername]);
    expect(res.body.data.members[0].role).toBe("OWNER");
  });

  it("lets a member leave", async () => {
    const res = await request(app)
      .post(`/api/v1/community/groups/${publicGroupId}/leave`)
      .set("Cookie", [betaCookie]);

    expect(res.status).toBe(200);
    expect(res.body.data.group.memberCount).toBe(1);
    expect(res.body.data.group.joined).toBe(false);

    const detail = await request(app)
      .get(`/api/v1/community/groups/${publicGroupId}`)
      .set("Cookie", [betaCookie]);
    expect(detail.body.data.group.viewerRole).toBeNull();
  });

  it("refuses to let an owner leave their own group", async () => {
    const res = await request(app)
      .post(`/api/v1/community/groups/${publicGroupId}/leave`)
      .set("Cookie", [alphaCookie]);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("treats a private group as missing for non-members", async () => {
    const created = await request(app)
      .post("/api/v1/community/groups")
      .set("Cookie", [alphaCookie])
      .send({ name: `Private Crew ${unique}`, visibility: "PRIVATE" });

    expect(created.status).toBe(201);
    expect(created.body.data.group.visibility).toBe("PRIVATE");
    privateGroupId = created.body.data.group.id;

    // The owner can read it...
    const owner = await request(app)
      .get(`/api/v1/community/groups/${privateGroupId}`)
      .set("Cookie", [alphaCookie]);
    expect(owner.status).toBe(200);

    // ...nobody else can, and joining is refused rather than merely forbidden.
    const stranger = await request(app)
      .get(`/api/v1/community/groups/${privateGroupId}`)
      .set("Cookie", [betaCookie]);
    expect(stranger.status).toBe(404);

    const join = await request(app)
      .post(`/api/v1/community/groups/${privateGroupId}/join`)
      .set("Cookie", [betaCookie]);
    expect(join.status).toBe(404);
  });

  it("keeps private groups out of the public listing", async () => {
    const anonymous = await request(app).get("/api/v1/community/groups");
    const ids = (anonymous.body.data.groups as Array<{ id: string }>).map((row) => row.id);
    expect(ids).toContain(publicGroupId);
    expect(ids).not.toContain(privateGroupId);

    // But its own members still see it.
    const owner = await request(app)
      .get("/api/v1/community/groups")
      .set("Cookie", [alphaCookie]);
    expect((owner.body.data.groups as Array<{ id: string }>).map((row) => row.id)).toContain(
      privateGroupId,
    );
  });

  it("404s for a group that does not exist", async () => {
    const res = await request(app).get(
      "/api/v1/community/groups/11111111-1111-4111-8111-111111111111",
    );
    expect(res.status).toBe(404);
  });
});

describe("community activity", () => {
  it("shows activity from published profiles only", async () => {
    // Beta publishes so there is a second public learner in the feed.
    await setVisibility(betaCookie, "PUBLIC");

    const res = await request(app).get("/api/v1/community/activity");
    expect(res.status).toBe(200);

    const items = res.body.data.items as Array<{ username: string; type: string }>;
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((item) => item.username === alphaUsername)).toBe(true);
    // The private learner solved three problems, and none of that may surface.
    expect(items.some((item) => item.username === privateUsername)).toBe(false);

    // Notebook writes are never shareable activity.
    expect(items.some((item) => item.type === "NOTE_UPDATED")).toBe(false);
  });

  it("carries the problem title for problem activity", async () => {
    const res = await request(app).get("/api/v1/community/activity");
    const solved = (res.body.data.items as Array<{ type: string; problemTitle: string | null }>).find(
      (item) => item.type === "PROBLEM_SOLVED",
    );
    expect(solved?.problemTitle).toBeTruthy();
  });
});

describe("weekly challenge", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/weekly-challenge");
    expect(res.status).toBe(401);
  });

  it("returns one shared set that does not re-roll", async () => {
    const first = await request(app).get("/api/v1/weekly-challenge").set("Cookie", [alphaCookie]);
    expect(first.status).toBe(200);
    expect(first.body.data.challenge.problems).toHaveLength(5);
    expect(first.body.data.totalCount).toBe(5);
    expect(first.body.data.challenge.weekKey).toMatch(/^\d{4}-W\d{2}$/);
    expect(first.body.data.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const second = await request(app).get("/api/v1/weekly-challenge").set("Cookie", [alphaCookie]);
    expect(second.body.data.challenge.problems.map((p: { id: string }) => p.id)).toEqual(
      first.body.data.challenge.problems.map((p: { id: string }) => p.id),
    );
    expect(second.body.data.challenge.weekKey).toBe(first.body.data.challenge.weekKey);
  });

  it("gives every learner the same problems", async () => {
    const alpha = await request(app).get("/api/v1/weekly-challenge").set("Cookie", [alphaCookie]);
    const beta = await request(app).get("/api/v1/weekly-challenge").set("Cookie", [betaCookie]);

    const ids = (body: { challenge: { problems: Array<{ id: string }> } }) =>
      body.challenge.problems.map((problem) => problem.id);
    expect(ids(beta.body.data)).toEqual(ids(alpha.body.data));
  });

  it("counts the viewer's own progress against the set", async () => {
    const before = await request(app)
      .get("/api/v1/weekly-challenge")
      .set("Cookie", [alphaCookie]);

    const unsolved = (
      before.body.data.challenge.problems as Array<{ id: string; viewerStatus: string | null }>
    ).find((problem) => problem.viewerStatus === null);
    expect(unsolved).toBeDefined();

    await setStatus(alphaCookie, unsolved!.id, "SOLVED");

    const after = await request(app)
      .get("/api/v1/weekly-challenge")
      .set("Cookie", [alphaCookie]);

    expect(after.body.data.solvedCount).toBe(before.body.data.solvedCount + 1);
  });

  it("reports each problem's viewer status", async () => {
    const res = await request(app).get("/api/v1/weekly-challenge").set("Cookie", [privateCookie]);
    for (const problem of res.body.data.challenge.problems) {
      expect(problem).toHaveProperty("viewerStatus");
    }
  });
});
