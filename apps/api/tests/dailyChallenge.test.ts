import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { COOKIE_NAMES } from "@dsarats/shared";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { localDateKey } from "../src/services/streak.service";

const app = createApp();

const unique = Date.now();
const suffix = unique.toString(36);
const password = "strongpass123";
const TIMEZONE = "Asia/Kolkata";

const mainEmail = `daily-main-${unique}@example.com`;
const peerEmail = `daily-peer-${unique}@example.com`;
const filterEmail = `daily-filter-${unique}@example.com`;

let mainId: string;
let peerId: string;
let filterId: string;
let mainCookie: string;
let peerCookie: string;
let filterCookie: string;
let mainChallengeId: string;

interface TopicWithCount {
  slug: string;
  name: string;
  _count: { problems: number };
}
let topicsWithProblems: TopicWithCount[] = [];
/** The smallest topic, solved entirely by the "filter" user to prove topic targeting. */
let smallestTopic: { slug: string; name: string; problemIds: string[] } | null = null;

function extractCookie(res: request.Response, name: string): string | undefined {
  const header = res.headers["set-cookie"];
  if (!header) return undefined;
  const list = Array.isArray(header) ? header : [header];
  const found = list.find((c) => c.startsWith(`${name}=`));
  return found?.split(";")[0];
}

async function registerUser(email: string, username: string): Promise<{ id: string; cookie: string }> {
  await request(app).post("/api/v1/auth/register").send({
    email,
    password,
    confirmPassword: password,
    username,
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.profile.update({ where: { userId: user.id }, data: { timezone: TIMEZONE } });

  const login = await request(app).post("/api/v1/auth/login").send({ email, password });
  return { id: user.id, cookie: extractCookie(login, COOKIE_NAMES.ACCESS)! };
}

/** Forget today's challenge so the next GET creates a fresh one (tests selection options). */
async function forgetChallenge(userId: string) {
  await prisma.dailyChallenge.deleteMany({ where: { userId } });
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [mainEmail, peerEmail, filterEmail] } } });

  const [main, peer, filter] = await Promise.all([
    registerUser(mainEmail, `daily_m_${suffix}`),
    registerUser(peerEmail, `daily_p_${suffix}`),
    registerUser(filterEmail, `daily_f_${suffix}`),
  ]);
  mainId = main.id;
  mainCookie = main.cookie;
  peerId = peer.id;
  peerCookie = peer.cookie;
  filterId = filter.id;
  filterCookie = filter.cookie;

  const topics = await request(app).get("/api/v1/topics");
  topicsWithProblems = (topics.body.data.topics as TopicWithCount[]).filter(
    (topic) => topic._count.problems > 0,
  );

  const smallest = [...topicsWithProblems].sort(
    (a, b) => a._count.problems - b._count.problems,
  )[0];

  // Only exercise the "weakest topic" path when the smallest topic is small enough to
  // solve quickly; otherwise the assertion would cost more than it proves.
  if (smallest && smallest._count.problems <= 12) {
    const detail = await request(app).get(`/api/v1/topics/${smallest.slug}/problems`);
    smallestTopic = {
      slug: smallest.slug,
      name: smallest.name,
      problemIds: (detail.body.data.problems as Array<{ id: string }>).map((p) => p.id),
    };
  }
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: [mainEmail, peerEmail, filterEmail] } },
  });
  await prisma.$disconnect();
});

describe("GET /api/v1/daily-challenge", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/daily-challenge");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns today's per-user challenge, creating it on first request", async () => {
    const res = await request(app).get("/api/v1/daily-challenge").set("Cookie", [mainCookie]);

    expect(res.status).toBe(200);
    expect(res.body.data.challenge).toBeTruthy();
    expect(res.body.data.challenge.date).toBe(localDateKey(new Date(), TIMEZONE));
    expect(res.body.data.challenge.problem.title).toBeTruthy();
    expect(res.body.data.challenge.problem.platformProblemUrl).toBeTruthy();
    // Every challenge carries a real, non-empty explanation of why it was chosen.
    expect(res.body.data.challenge.reason.length).toBeGreaterThan(0);
    expect(res.body.data.completion).toBeNull();

    mainChallengeId = res.body.data.challenge.id;
  });

  it("returns the same challenge for the same user and day", async () => {
    const res = await request(app).get("/api/v1/daily-challenge").set("Cookie", [mainCookie]);
    expect(res.status).toBe(200);
    expect(res.body.data.challenge.id).toBe(mainChallengeId);
  });

  it("only ever stores one challenge per user and date", async () => {
    const rows = await prisma.dailyChallenge.count({
      where: { userId: mainId, date: new Date(`${localDateKey(new Date(), TIMEZONE)}T00:00:00.000Z`) },
    });
    expect(rows).toBe(1);
  });

  it("gives each user their own challenge", async () => {
    const res = await request(app).get("/api/v1/daily-challenge").set("Cookie", [peerCookie]);
    expect(res.status).toBe(200);
    expect(res.body.data.challenge.id).not.toBe(mainChallengeId);

    // A user with no history gets an honest foundational pick, not a coverage claim.
    expect(res.body.data.challenge.reason).toContain("foundational");

    const peerChallenge = await prisma.dailyChallenge.findFirstOrThrow({ where: { userId: peerId } });
    expect(peerChallenge.userId).toBe(peerId);
  });
});

describe("daily-challenge recommendation", () => {
  it("targets the least-covered topic once a topic is fully solved", async () => {
    if (!smallestTopic) return; // catalog too large to set up cheaply

    for (const problemId of smallestTopic.problemIds) {
      const res = await request(app)
        .patch(`/api/v1/problems/${problemId}/progress`)
        .set("Cookie", [filterCookie])
        .send({ status: "SOLVED" });
      expect(res.status).toBe(200);
    }

    await forgetChallenge(filterId);
    const res = await request(app).get("/api/v1/daily-challenge").set("Cookie", [filterCookie]);

    expect(res.status).toBe(200);
    const chosen = res.body.data.challenge.problem as { id: string; topic: { slug: string } };
    // A fully-covered topic must never win — the pick comes from what's left.
    expect(chosen.topic.slug).not.toBe(smallestTopic.slug);
    expect(smallestTopic.problemIds).not.toContain(chosen.id);
  });

  it("restricts the pick to a requested topic", async () => {
    const topic = topicsWithProblems[0]!;
    await forgetChallenge(filterId);

    const res = await request(app)
      .get("/api/v1/daily-challenge")
      .query({ topic: topic.slug })
      .set("Cookie", [filterCookie]);

    expect(res.status).toBe(200);
    expect(res.body.data.challenge.problem.topic.slug).toBe(topic.slug);
  });

  it("restricts the pick to a requested difficulty", async () => {
    await forgetChallenge(filterId);

    const res = await request(app)
      .get("/api/v1/daily-challenge")
      .query({ difficulty: "HARD" })
      .set("Cookie", [filterCookie]);

    expect(res.status).toBe(200);
    expect(res.body.data.challenge.problem.difficulty).toBe("HARD");
  });

  it("honors the random strategy", async () => {
    await forgetChallenge(filterId);

    const res = await request(app)
      .get("/api/v1/daily-challenge")
      .query({ strategy: "random" })
      .set("Cookie", [filterCookie]);

    expect(res.status).toBe(200);
    expect(res.body.data.challenge.reason).toContain("random");
  });

  it("returns 404 when a filter matches no problems", async () => {
    await forgetChallenge(filterId);

    const res = await request(app)
      .get("/api/v1/daily-challenge")
      .query({ topic: "no-such-topic-xyz" })
      .set("Cookie", [filterCookie]);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects an unknown difficulty with 400", async () => {
    const res = await request(app)
      .get("/api/v1/daily-challenge")
      .query({ difficulty: "IMPOSSIBLE" })
      .set("Cookie", [filterCookie]);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("ignores later options once the day's challenge exists", async () => {
    if (topicsWithProblems.length < 2) return;
    const [first, second] = topicsWithProblems as [TopicWithCount, TopicWithCount];

    await forgetChallenge(filterId);
    const created = await request(app)
      .get("/api/v1/daily-challenge")
      .query({ topic: first.slug })
      .set("Cookie", [filterCookie]);
    expect(created.status).toBe(200);

    const again = await request(app)
      .get("/api/v1/daily-challenge")
      .query({ topic: second.slug })
      .set("Cookie", [filterCookie]);

    expect(again.status).toBe(200);
    expect(again.body.data.challenge.id).toBe(created.body.data.challenge.id);
    expect(again.body.data.challenge.problem.topic.slug).toBe(first.slug);
  });
});

describe("POST /api/v1/daily-challenge/complete", () => {
  it("rejects an unknown status with 400", async () => {
    const res = await request(app)
      .post("/api/v1/daily-challenge/complete")
      .set("Cookie", [mainCookie])
      .send({ status: "DONE" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("records a skip without giving a streak day", async () => {
    const res = await request(app)
      .post("/api/v1/daily-challenge/complete")
      .set("Cookie", [mainCookie])
      .send({ status: "SKIPPED" });

    expect(res.status).toBe(200);
    expect(res.body.data.completion.status).toBe("SKIPPED");
    expect(res.body.data.streak).toMatchObject({ current: 0, activeToday: false });

    expect(
      await prisma.activityLog.count({ where: { userId: mainId, type: "DAILY_CHALLENGE" } }),
    ).toBe(0);
    expect(await prisma.streakRecord.count({ where: { userId: mainId } })).toBe(0);
  });

  it("counts a completed challenge toward the streak", async () => {
    const res = await request(app)
      .post("/api/v1/daily-challenge/complete")
      .set("Cookie", [mainCookie])
      .send({ status: "ATTEMPTED" });

    expect(res.status).toBe(200);
    expect(res.body.data.completion.status).toBe("ATTEMPTED");
    expect(res.body.data.challenge.id).toBe(mainChallengeId);
    expect(res.body.data.streak).toMatchObject({
      current: 1,
      longest: 1,
      activeToday: true,
      timezone: TIMEZONE,
    });

    const streakRow = await prisma.streakRecord.findFirstOrThrow({ where: { userId: mainId } });
    expect(streakRow.activityTypes).toEqual(["DAILY_CHALLENGE"]);
  });

  it("is idempotent — repeating the same status adds no activity", async () => {
    const res = await request(app)
      .post("/api/v1/daily-challenge/complete")
      .set("Cookie", [mainCookie])
      .send({ status: "ATTEMPTED" });

    expect(res.status).toBe(200);
    expect(
      await prisma.activityLog.count({ where: { userId: mainId, type: "DAILY_CHALLENGE" } }),
    ).toBe(1);
    expect(await prisma.dailyChallengeCompletion.count({ where: { userId: mainId } })).toBe(1);
    expect(await prisma.streakRecord.count({ where: { userId: mainId } })).toBe(1);
  });

  it("keeps completions isolated between users", async () => {
    const peerComplete = await request(app)
      .post("/api/v1/daily-challenge/complete")
      .set("Cookie", [peerCookie])
      .send({ status: "SOLVED" });
    expect(peerComplete.status).toBe(200);

    expect(await prisma.dailyChallengeCompletion.count({ where: { userId: peerId } })).toBe(1);
    expect(await prisma.dailyChallengeCompletion.count({ where: { userId: mainId } })).toBe(1);

    // A SOLVED challenge is a solved problem: it must count toward the day's total.
    const peerStreak = await prisma.streakRecord.findFirstOrThrow({ where: { userId: peerId } });
    expect(peerStreak.problemsSolved).toBe(1);
    expect(peerStreak.activityTypes).toEqual(["DAILY_CHALLENGE"]);
  });
});

describe("GET /api/v1/daily-challenge/history", () => {
  it("lists the user's completions, newest first", async () => {
    const res = await request(app)
      .get("/api/v1/daily-challenge/history")
      .set("Cookie", [mainCookie]);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].challenge.id).toBe(mainChallengeId);
    expect(res.body.data.items[0].challenge.date).toBe(localDateKey(new Date(), TIMEZONE));
    expect(res.body.data.items[0].completion.status).toBe("ATTEMPTED");
    expect(res.body.data.nextCursor).toBeNull();
  });

  it("only returns the requesting user's history", async () => {
    const res = await request(app)
      .get("/api/v1/daily-challenge/history")
      .set("Cookie", [peerCookie]);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].completion.status).toBe("SOLVED");
  });

  it("rejects an invalid cursor with 400", async () => {
    const res = await request(app)
      .get("/api/v1/daily-challenge/history")
      .query({ cursor: "not-a-cursor" })
      .set("Cookie", [mainCookie]);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
