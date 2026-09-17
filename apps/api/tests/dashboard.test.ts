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
const email = `dashboard-${unique}@example.com`;
// A non-UTC zone so every assertion proves the API used the user's local day.
const TIMEZONE = "Asia/Kolkata";

let cookie: string;
let userId: string;
let problemIds: string[];

function extractCookie(res: request.Response, name: string): string | undefined {
  const header = res.headers["set-cookie"];
  if (!header) return undefined;
  const list = Array.isArray(header) ? header : [header];
  const found = list.find((c) => c.startsWith(`${name}=`));
  return found?.split(";")[0];
}

async function setStatus(problemId: string, status: string) {
  return request(app)
    .patch(`/api/v1/problems/${problemId}/progress`)
    .set("Cookie", [cookie])
    .send({ status });
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email } });

  await request(app).post("/api/v1/auth/register").send({
    email,
    password,
    confirmPassword: password,
    username: `dash_${suffix}`,
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  userId = user.id;
  await prisma.profile.update({ where: { userId }, data: { timezone: TIMEZONE } });

  const login = await request(app).post("/api/v1/auth/login").send({ email, password });
  cookie = extractCookie(login, COOKIE_NAMES.ACCESS)!;

  const list = await request(app).get("/api/v1/problems").query({ limit: 3 });
  problemIds = list.body.data.items.map((item: { id: string }) => item.id);

  // Two solves keep the streak alive; a third attempted problem must not.
  await setStatus(problemIds[0]!, "SOLVED");
  await setStatus(problemIds[1]!, "SOLVED");
  await setStatus(problemIds[2]!, "ATTEMPTED");
});

afterAll(async () => {
  // Cascades remove UserProblem, ActivityLog, StreakRecord, and challenge completions.
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

describe("GET /api/v1/streak", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/streak");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns the current streak plus this month's activity calendar", async () => {
    const res = await request(app).get("/api/v1/streak").set("Cookie", [cookie]);
    const today = localDateKey(new Date(), TIMEZONE);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      current: 1,
      longest: 1,
      activeToday: true,
      today,
      timezone: TIMEZONE,
      month: today.slice(0, 7),
    });
    expect(res.body.data.calendar).toHaveLength(1);
    expect(res.body.data.calendar[0]).toMatchObject({
      date: today,
      problemsSolved: 2,
      count: 2,
      activityTypes: ["PROBLEM_SOLVED"],
    });
  });

  it("returns an empty calendar for a month with no activity", async () => {
    const res = await request(app)
      .get("/api/v1/streak")
      .query({ month: "2000-01" })
      .set("Cookie", [cookie]);

    expect(res.status).toBe(200);
    expect(res.body.data.month).toBe("2000-01");
    expect(res.body.data.calendar).toEqual([]);
  });

  it("rejects a malformed month with 400", async () => {
    const res = await request(app)
      .get("/api/v1/streak")
      .query({ month: "2026-13" })
      .set("Cookie", [cookie]);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});

describe("GET /api/v1/dashboard", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/dashboard");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns one payload with stats, challenge, weekly activity, and insight", async () => {
    const res = await request(app).get("/api/v1/dashboard").set("Cookie", [cookie]);
    const today = localDateKey(new Date(), TIMEZONE);

    expect(res.status).toBe(200);
    const { stats, challenge, continueLearning, weeklyActivity, topicProgress, revisionDue, insight } =
      res.body.data;

    expect(stats).toMatchObject({
      currentStreak: 1,
      longestStreak: 1,
      activeToday: true,
      solved: 2,
      solvedToday: 2,
      weeklySolved: 2,
      weeklyGoal: null,
    });
    expect(stats.totalProblems).toBeGreaterThanOrEqual(3);

    // Today's challenge is created lazily, exactly like GET /daily-challenge.
    expect(challenge.challenge.problem.title).toBeTruthy();
    expect(challenge.completion).toBeNull();

    // No sheet was started, so there is nothing to continue.
    expect(continueLearning).toEqual([]);

    // A full Monday → Sunday week, with today's real solves.
    expect(weeklyActivity).toHaveLength(7);
    expect(weeklyActivity.find((day: { date: string }) => day.date === today)).toMatchObject({
      problemsSolved: 2,
    });

    expect(topicProgress.length).toBeGreaterThanOrEqual(1);
    expect(topicProgress.every((topic: { total: number }) => topic.total > 0)).toBe(true);

    // Solving schedules revision, but nothing is due yet (first interval is 1 day).
    expect(revisionDue).toMatchObject({ count: 0, items: [] });
    expect(insight).toContain("solved 2 of");
  });
});
