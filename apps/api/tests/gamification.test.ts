import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { ACHIEVEMENTS, COOKIE_NAMES, levelForXp, XP_PER_LEVEL, XP_RULES } from "@dsarats/shared";
import { createApp } from "../src/app";
import { prisma } from "../src/db";

const app = createApp();

const unique = Date.now();
const suffix = unique.toString(36);
const password = "strongpass123";

const earnerEmail = `gamification-earner-${unique}@example.com`;
const idleEmail = `gamification-idle-${unique}@example.com`;

let earnerId: string;
let idleCookie: string;
let earnerCookie: string;
let problemIds: string[];

function extractCookie(res: request.Response, name: string): string | undefined {
  const header = res.headers["set-cookie"];
  if (!header) return undefined;
  const list = Array.isArray(header) ? header : [header];
  const found = list.find((c) => c.startsWith(`${name}=`));
  return found?.split(";")[0];
}

async function register(email: string, username: string): Promise<void> {
  await request(app)
    .post("/api/v1/auth/register")
    .send({ email, password, confirmPassword: password, username });
}

function setStatus(cookie: string, problemId: string, status: string) {
  return request(app)
    .patch(`/api/v1/problems/${problemId}/progress`)
    .set("Cookie", [cookie])
    .send({ status });
}

/** The achievement row for a key, from GET /achievements. */
async function achievement(cookie: string, key: string) {
  const res = await request(app).get("/api/v1/achievements").set("Cookie", [cookie]);
  expect(res.status).toBe(200);
  return (res.body.data.achievements as Array<Record<string, unknown>>).find(
    (row) => row.key === key,
  )!;
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [earnerEmail, idleEmail] } } });

  await register(earnerEmail, `gm_e_${suffix}`);
  await register(idleEmail, `gm_i_${suffix}`);

  const earner = await prisma.user.findUniqueOrThrow({ where: { email: earnerEmail } });
  earnerId = earner.id;

  const earnerLogin = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: earnerEmail, password });
  const idleLogin = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: idleEmail, password });

  earnerCookie = extractCookie(earnerLogin, COOKIE_NAMES.ACCESS)!;
  idleCookie = extractCookie(idleLogin, COOKIE_NAMES.ACCESS)!;

  const list = await request(app).get("/api/v1/problems").query({ limit: 12 });
  problemIds = (list.body.data.items as Array<{ id: string }>).map((item) => item.id);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [earnerEmail, idleEmail] } } });
  await prisma.$disconnect();
});

describe("achievements catalogue", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/achievements");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("serves the whole catalogue with nothing unlocked for a new account", async () => {
    const res = await request(app).get("/api/v1/achievements").set("Cookie", [idleCookie]);
    expect(res.status).toBe(200);

    expect(res.body.data.totalCount).toBe(ACHIEVEMENTS.length);
    expect(res.body.data.unlockedCount).toBe(0);
    for (const row of res.body.data.achievements) {
      expect(row.unlocked).toBe(false);
      expect(row.unlockedAt).toBeNull();
      expect(row.progress).toBe(0);
    }
  });

  it("syncs the catalogue from the shared definitions without duplicating rows", async () => {
    const count = await prisma.achievement.count();
    expect(count).toBe(ACHIEVEMENTS.length);

    // A second read must not add rows.
    await request(app).get("/api/v1/achievements").set("Cookie", [idleCookie]);
    expect(await prisma.achievement.count()).toBe(ACHIEVEMENTS.length);
  });
});

describe("XP", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/xp");
    expect(res.status).toBe(401);
  });

  it("awards XP for a real solve and none for an attempt", async () => {
    const before = await request(app).get("/api/v1/xp").set("Cookie", [earnerCookie]);
    expect(before.body.data.total).toBe(0);

    await setStatus(earnerCookie, problemIds[0]!, "ATTEMPTED");
    const attempted = await request(app).get("/api/v1/xp").set("Cookie", [earnerCookie]);
    // Attempting is progress, but it is not a solve and earns nothing.
    expect(attempted.body.data.total).toBe(0);

    await setStatus(earnerCookie, problemIds[0]!, "SOLVED");
    const solved = await request(app).get("/api/v1/xp").set("Cookie", [earnerCookie]);
    expect(solved.body.data.total).toBe(XP_RULES.PROBLEM_SOLVED);
    expect(solved.body.data.level).toBe(1);
    expect(solved.body.data.pointsToNextLevel).toBe(XP_PER_LEVEL - XP_RULES.PROBLEM_SOLVED);
  });

  it("cannot be farmed by re-sending the same status", async () => {
    await setStatus(earnerCookie, problemIds[0]!, "SOLVED");
    await setStatus(earnerCookie, problemIds[0]!, "SOLVED");

    const res = await request(app).get("/api/v1/xp").set("Cookie", [earnerCookie]);
    // One distinct problem solved is worth one solve, however many times it is marked.
    expect(res.body.data.total).toBe(XP_RULES.PROBLEM_SOLVED);
    const solvedSource = res.body.data.sources.find(
      (source: { key: string }) => source.key === "PROBLEM_SOLVED",
    );
    expect(solvedSource.count).toBe(1);
  });

  it("counts XP once per solve when a revision is mastered", async () => {
    await setStatus(earnerCookie, problemIds[0]!, "MASTERED");

    const res = await request(app).get("/api/v1/xp").set("Cookie", [earnerCookie]);
    expect(res.body.data.total).toBe(
      XP_RULES.PROBLEM_SOLVED + XP_RULES.PROBLEM_MASTERED,
    );
  });
});

describe("achievement unlocking", () => {
  it("unlocks an achievement at the moment the activity happens", async () => {
    const first = await achievement(earnerCookie, "first-solve");

    expect(first.unlocked).toBe(true);
    expect(typeof first.unlockedAt).toBe("string");
    // Recorded when the solve happened, not when the page was opened.
    expect(new Date(first.unlockedAt as string).getTime()).toBeLessThanOrEqual(Date.now());
    expect(first.progress).toBe(first.threshold);
  });

  it("unlocks the mastery achievement only after mastering", async () => {
    const mastered = await achievement(earnerCookie, "mastered-1");
    expect(mastered.unlocked).toBe(true);
  });

  it("advances progress without unlocking when the threshold is not met", async () => {
    const tenSolved = await achievement(earnerCookie, "solved-10");
    expect(tenSolved.unlocked).toBe(false);
    expect(tenSolved.progress).toBe(1);
    expect(tenSolved.threshold).toBe(10);
  });

  it("unlocks the ten-solve achievement once ten distinct problems are solved", async () => {
    // Solved one at a time on purpose: this asserts the threshold, not write throughput,
    // and every write for one user serialises on that day's streak row anyway.
    for (const problemId of problemIds.slice(1, 10)) {
      const res = await setStatus(earnerCookie, problemId, "SOLVED");
      expect(res.status).toBe(200);
    }

    const tenSolved = await achievement(earnerCookie, "solved-10");
    expect(tenSolved.unlocked).toBe(true);

    const xp = await request(app).get("/api/v1/xp").set("Cookie", [earnerCookie]);
    // 10 distinct solves + one mastery.
    const expected = 10 * XP_RULES.PROBLEM_SOLVED + XP_RULES.PROBLEM_MASTERED;
    expect(xp.body.data.total).toBe(expected);
    // 125 XP is still inside level 1 — the API must not round the level up.
    expect(xp.body.data.level).toBe(1);
    expect(xp.body.data.pointsIntoLevel).toBe(expected);
    expect(xp.body.data.pointsToNextLevel).toBe(XP_PER_LEVEL - expected);
  });

  it("steps up a level at each 250-XP boundary", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(XP_PER_LEVEL - 1)).toBe(1);
    expect(levelForXp(XP_PER_LEVEL)).toBe(2);
    expect(levelForXp(XP_PER_LEVEL * 2)).toBe(3);
    expect(levelForXp(XP_PER_LEVEL * 2 - 1)).toBe(2);
  });

  it("counts topic breadth from engagement, not only from solves", async () => {
    const progressFor = async (cookie: string) => {
      const res = await request(app).get("/api/v1/achievements").set("Cookie", [cookie]);
      return (res.body.data.achievements as Array<{ key: string; progress: number }>).find(
        (row) => row.key === "topics-5",
      )!.progress;
    };

    const before = await progressFor(idleCookie);
    expect(before).toBe(0);

    // An attempt alone should register the topic.
    await setStatus(idleCookie, problemIds[11]!, "ATTEMPTED");
    expect(await progressFor(idleCookie)).toBe(1);
  });

  it("keeps unlocks private to each user", async () => {
    const res = await request(app).get("/api/v1/achievements").set("Cookie", [idleCookie]);
    expect(res.body.data.unlockedCount).toBe(0);
    expect(res.body.data.achievements.every((row: { unlocked: boolean }) => !row.unlocked)).toBe(
      true,
    );
  });

  it("stores exactly one unlock row per (user, achievement)", async () => {
    const duplicates = await prisma.userAchievement.groupBy({
      by: ["userId", "achievementId"],
      _count: { achievementId: true },
    });
    for (const row of duplicates) {
      expect(row._count.achievementId).toBe(1);
    }

    const unlocks = await prisma.userAchievement.findMany({ where: { userId: earnerId } });
    expect(unlocks.length).toBeGreaterThan(0);
    // Every unlock points at a real catalogue row.
    const catalogIds = new Set((await prisma.achievement.findMany()).map((row) => row.id));
    for (const unlock of unlocks) expect(catalogIds.has(unlock.achievementId)).toBe(true);
  });
});
