import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { COOKIE_NAMES, LIMITS } from "@dsarats/shared";
import { createApp } from "../src/app";
import { prisma } from "../src/db";

const app = createApp();

const unique = Date.now();
const suffix = unique.toString(36);
const password = "strongpass123";

const mainEmail = `profile-main-${unique}@example.com`;
const peerEmail = `profile-peer-${unique}@example.com`;
const mainUsername = `prof_m_${suffix}`;
const peerUsername = `prof_p_${suffix}`;

let mainCookie: string;
let peerCookie: string;

function extractCookie(res: request.Response, name: string): string | undefined {
  const header = res.headers["set-cookie"];
  if (!header) return undefined;
  const list = Array.isArray(header) ? header : [header];
  const found = list.find((c) => c.startsWith(`${name}=`));
  return found?.split(";")[0];
}

async function registerUser(email: string, username: string) {
  await request(app).post("/api/v1/auth/register").send({
    email,
    password,
    confirmPassword: password,
    username,
  });
  const login = await request(app).post("/api/v1/auth/login").send({ email, password });
  return extractCookie(login, COOKIE_NAMES.ACCESS)!;
}

function patchProfile(cookie: string, body: Record<string, unknown>) {
  return request(app).patch("/api/v1/users/me/profile").set("Cookie", [cookie]).send(body);
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [mainEmail, peerEmail] } } });
  mainCookie = await registerUser(mainEmail, mainUsername);
  peerCookie = await registerUser(peerEmail, peerUsername);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [mainEmail, peerEmail] } } });
  await prisma.$disconnect();
});

describe("GET /api/v1/users/me/profile", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/users/me/profile");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns the authenticated user's own profile", async () => {
    const res = await request(app).get("/api/v1/users/me/profile").set("Cookie", [mainCookie]);
    expect(res.status).toBe(200);
    expect(res.body.data.user.profile).toMatchObject({
      username: mainUsername,
      timezone: "UTC",
      learningGoal: null,
      bio: null,
    });
  });
});

describe("PATCH /api/v1/users/me/profile", () => {
  it("requires authentication", async () => {
    const res = await patchProfile("", { timezone: "UTC" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("accepts an empty body as a no-op", async () => {
    const res = await patchProfile(mainCookie, {});
    expect(res.status).toBe(200);
    expect(res.body.data.user.profile.username).toBe(mainUsername);
  });

  it("updates the timezone and reflects it in streak calculations", async () => {
    const res = await patchProfile(mainCookie, { timezone: "Asia/Kolkata" });
    expect(res.status).toBe(200);
    expect(res.body.data.user.profile.timezone).toBe("Asia/Kolkata");

    const me = await request(app).get("/api/v1/auth/me").set("Cookie", [mainCookie]);
    expect(me.body.data.user.profile.timezone).toBe("Asia/Kolkata");

    // The streak service must actually use it, not just store it.
    const streak = await request(app).get("/api/v1/streak").set("Cookie", [mainCookie]);
    expect(streak.body.data.timezone).toBe("Asia/Kolkata");
  });

  it("rejects an unknown timezone with 400", async () => {
    const res = await patchProfile(mainCookie, { timezone: "Mars/Olympus_Mons" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.field).toBe("timezone");
  });

  it("does not persist a rejected timezone", async () => {
    const me = await request(app).get("/api/v1/auth/me").set("Cookie", [mainCookie]);
    expect(me.body.data.user.profile.timezone).toBe("Asia/Kolkata");
  });

  it("makes the weekly goal real on the dashboard", async () => {
    const res = await patchProfile(mainCookie, { learningGoal: 5 });
    expect(res.status).toBe(200);
    expect(res.body.data.user.profile.learningGoal).toBe(5);

    const dashboard = await request(app).get("/api/v1/dashboard").set("Cookie", [mainCookie]);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.stats.weeklyGoal).toBe(5);
    expect(typeof dashboard.body.data.stats.weeklySolved).toBe("number");
  });

  it("clears the weekly goal with null", async () => {
    const res = await patchProfile(mainCookie, { learningGoal: null });
    expect(res.status).toBe(200);
    expect(res.body.data.user.profile.learningGoal).toBeNull();

    const dashboard = await request(app).get("/api/v1/dashboard").set("Cookie", [mainCookie]);
    expect(dashboard.body.data.stats.weeklyGoal).toBeNull();
  });

  it("rejects an out-of-range weekly goal with 400", async () => {
    for (const learningGoal of [0, LIMITS.WEEKLY_GOAL_MAX + 1, 2.5]) {
      const res = await patchProfile(mainCookie, { learningGoal });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    }
  });

  it("updates display name and bio, then clears the bio with null", async () => {
    const updated = await patchProfile(mainCookie, {
      displayName: "Ravi",
      bio: "Grinding graphs this month.",
    });
    expect(updated.status).toBe(200);
    expect(updated.body.data.user.profile).toMatchObject({
      displayName: "Ravi",
      bio: "Grinding graphs this month.",
    });

    const me = await request(app).get("/api/v1/auth/me").set("Cookie", [mainCookie]);
    expect(me.body.data.user.profile.bio).toBe("Grinding graphs this month.");

    const cleared = await patchProfile(mainCookie, { bio: null });
    expect(cleared.body.data.user.profile.bio).toBeNull();
    // displayName is untouched by a partial update.
    expect(cleared.body.data.user.profile.displayName).toBe("Ravi");
  });

  it("rejects an over-long bio with 400", async () => {
    const res = await patchProfile(mainCookie, { bio: "x".repeat(LIMITS.BIO_MAX + 1) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects an unknown field with 400", async () => {
    const res = await patchProfile(mainCookie, { nickname: "not a field" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects a username already taken by another user with 409", async () => {
    const res = await patchProfile(mainCookie, { username: peerUsername });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
    expect(res.body.error.field).toBe("username");
  });

  it("allows a valid username change and keeps it unique", async () => {
    const next = `prof_r_${suffix}`;
    const res = await patchProfile(mainCookie, { username: next });
    expect(res.status).toBe(200);
    expect(res.body.data.user.profile.username).toBe(next);

    const me = await request(app).get("/api/v1/auth/me").set("Cookie", [mainCookie]);
    expect(me.body.data.user.profile.username).toBe(next);
  });

  it("keeps each user's settings isolated", async () => {
    const peer = await request(app)
      .get("/api/v1/users/me/profile")
      .set("Cookie", [peerCookie]);
    expect(peer.body.data.user.profile.timezone).toBe("UTC");
    expect(peer.body.data.user.profile.displayName).toBeNull();
  });
});
