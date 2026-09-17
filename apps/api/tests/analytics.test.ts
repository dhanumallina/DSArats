import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { COOKIE_NAMES, SOLVED_OVER_TIME_DAYS } from "@dsarats/shared";
import { createApp } from "../src/app";
import { prisma } from "../src/db";

const app = createApp();

const unique = Date.now();
const suffix = unique.toString(36);
const password = "strongpass123";

const activeEmail = `analytics-active-${unique}@example.com`;
const emptyEmail = `analytics-empty-${unique}@example.com`;

let activeCookie: string;
let emptyCookie: string;
let easyProblemId: string;
let mediumProblemId: string;
let attemptedProblemId: string;

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

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [activeEmail, emptyEmail] } } });

  await register(activeEmail, `an_a_${suffix}`);
  await register(emptyEmail, `an_e_${suffix}`);

  const activeLogin = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: activeEmail, password });
  const emptyLogin = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: emptyEmail, password });

  activeCookie = extractCookie(activeLogin, COOKIE_NAMES.ACCESS)!;
  emptyCookie = extractCookie(emptyLogin, COOKIE_NAMES.ACCESS)!;

  const [easy, medium, third] = await Promise.all([
    request(app).get("/api/v1/problems").query({ difficulty: "EASY", limit: 1 }),
    request(app).get("/api/v1/problems").query({ difficulty: "MEDIUM", limit: 1 }),
    request(app).get("/api/v1/problems").query({ limit: 3 }),
  ]);
  easyProblemId = easy.body.data.items[0].id;
  mediumProblemId = medium.body.data.items[0].id;
  // A third problem that is attempted but never solved.
  attemptedProblemId = third.body.data.items.find(
    (item: { id: string }) => item.id !== easyProblemId && item.id !== mediumProblemId,
  ).id;

  // Two solves (one per difficulty) plus one attempt that never became a solve.
  await setStatus(activeCookie, easyProblemId, "SOLVED");
  await setStatus(activeCookie, mediumProblemId, "SOLVED");
  await setStatus(activeCookie, attemptedProblemId, "ATTEMPTED");

  // A solved daily challenge — it earns XP and counts as revision-free activity, but
  // must NOT appear as an extra solved problem (the challenge records engagement only).
  await request(app).get("/api/v1/daily-challenge").set("Cookie", [activeCookie]);
  await request(app)
    .post("/api/v1/daily-challenge/complete")
    .set("Cookie", [activeCookie])
    .send({ status: "SOLVED" });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [activeEmail, emptyEmail] } } });
  await prisma.$disconnect();
});

describe("GET /api/v1/analytics", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/analytics");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("reports totals, difficulty distribution, and status counts from real rows", async () => {
    const res = await request(app).get("/api/v1/analytics").set("Cookie", [activeCookie]);
    expect(res.status).toBe(200);

    const data = res.body.data;
    expect(data.totals.solved).toBe(2);
    expect(data.totals.attempted).toBe(1);
    expect(data.byDifficulty.EASY.solved).toBe(1);
    expect(data.byDifficulty.MEDIUM.solved).toBe(1);
    expect(data.byDifficulty.HARD.solved).toBe(0);
    expect(data.byStatus.SOLVED).toBe(2);
    expect(data.byStatus.ATTEMPTED).toBe(1);
    expect(data.byStatus.MASTERED).toBe(0);
    // The daily challenge is engagement, not a third solved problem.
    expect(data.totals.solved + data.totals.attempted + data.totals.notStarted).toBe(
      data.totals.publishedProblems,
    );
  });

  it("computes the success rate over solved plus never-solved attempts", async () => {
    const res = await request(app).get("/api/v1/analytics").set("Cookie", [activeCookie]);
    expect(res.body.data.successRate).toBeCloseTo(2 / 3, 6);
  });

  it("returns a zero-filled 90-day solve series ending today", async () => {
    const res = await request(app).get("/api/v1/analytics").set("Cookie", [activeCookie]);
    const series = res.body.data.solvedOverTime as Array<{ date: string; solved: number }>;

    expect(series).toHaveLength(SOLVED_OVER_TIME_DAYS);
    // Today is the last point by construction, and both solves happened just now.
    expect(series.at(-1)!.solved).toBe(2);
    // A re-solve never adds a second solve to the same day.
    expect(series.reduce((sum, point) => sum + point.solved, 0)).toBe(2);

    // Dates ascend with no gaps, so the chart axis is continuous.
    for (let i = 1; i < series.length; i += 1) {
      expect(series[i]!.date > series[i - 1]!.date).toBe(true);
    }
  });

  it("reports revision activity without counting unscheduled problems as due", async () => {
    const res = await request(app).get("/api/v1/analytics").set("Cookie", [activeCookie]);
    expect(res.body.data.revision).toMatchObject({
      totalReviews: 0,
      reviewsLast30Days: 0,
      activeSchedules: 2,
      mastered: 0,
      dueNow: 0,
      overdue: 0,
    });
  });

  it("breaks XP down into the activity that earned it", async () => {
    const res = await request(app).get("/api/v1/analytics").set("Cookie", [activeCookie]);
    const xp = res.body.data.xp;

    // 2 solved × 10 + 1 daily challenge × 15.
    expect(xp.total).toBe(35);
    expect(xp.level).toBe(1);
    expect(xp.pointsIntoLevel).toBe(35);
    expect(xp.pointsToNextLevel).toBe(215);
    expect(xp.nextLevelAt).toBe(250);

    const byKey = Object.fromEntries(
      (xp.sources as Array<{ key: string; count: number; points: number }>).map((source) => [
        source.key,
        source,
      ]),
    );
    expect(byKey.PROBLEM_SOLVED).toMatchObject({ count: 2, points: 20, pointsEach: 10 });
    expect(byKey.DAILY_CHALLENGE).toMatchObject({ count: 1, points: 15, pointsEach: 15 });
    expect(byKey.PROBLEM_MASTERED).toMatchObject({ count: 0, points: 0 });
    // The breakdown is exhaustive: the parts add up to the total.
    const sum = (xp.sources as Array<{ points: number }>).reduce((total, s) => total + s.points, 0);
    expect(sum).toBe(xp.total);
  });

  it("carries a readiness estimate whose factors explain the score", async () => {
    const res = await request(app).get("/api/v1/analytics").set("Cookie", [activeCookie]);
    const readiness = res.body.data.readiness;

    expect(readiness.score).toBeGreaterThanOrEqual(0);
    expect(readiness.score).toBeLessThanOrEqual(100);
    expect(readiness.factors).toHaveLength(5);
    expect(typeof readiness.band).toBe("string");
    expect(readiness.disclaimer).toContain("estimate");

    const weights = readiness.factors.map((factor: { weight: number }) => factor.weight);
    expect(weights.reduce((sum: number, weight: number) => sum + weight, 0)).toBeCloseTo(1, 10);

    // The published score is exactly the sum of its published parts — no hidden input.
    const points = readiness.factors.map((factor: { points: number }) => factor.points);
    expect(Math.round(points.reduce((sum: number, p: number) => sum + p, 0))).toBe(readiness.score);

    for (const factor of readiness.factors) {
      expect(factor.value).toBeGreaterThanOrEqual(0);
      expect(factor.value).toBeLessThanOrEqual(1);
      expect(factor.detail).toBeTruthy();
    }
  });

  it("keeps every figure at zero for a brand-new account rather than inventing a baseline", async () => {
    const res = await request(app).get("/api/v1/analytics").set("Cookie", [emptyCookie]);
    expect(res.status).toBe(200);

    expect(res.body.data.totals.solved).toBe(0);
    expect(res.body.data.successRate).toBeNull();
    expect(res.body.data.xp.total).toBe(0);
    expect(res.body.data.xp.level).toBe(1);
    expect(res.body.data.revision.activeSchedules).toBe(0);
    expect(res.body.data.readiness.score).toBe(0);
    expect(res.body.data.readiness.band).toBe("Not enough data yet");
    expect(res.body.data.solvedOverTime.every((point: { solved: number }) => point.solved === 0)).toBe(
      true,
    );
  });

  it("keeps each user's analytics isolated", async () => {
    const res = await request(app).get("/api/v1/analytics").set("Cookie", [emptyCookie]);
    expect(res.body.data.totals.solved).toBe(0);
    expect(res.body.data.byStatus.SOLVED).toBe(0);
  });
});

describe("GET /api/v1/analytics/readiness", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/analytics/readiness");
    expect(res.status).toBe(401);
  });

  it("returns the same score the analytics payload publishes", async () => {
    const [analytics, readiness] = await Promise.all([
      request(app).get("/api/v1/analytics").set("Cookie", [activeCookie]),
      request(app).get("/api/v1/analytics/readiness").set("Cookie", [activeCookie]),
    ]);

    expect(readiness.status).toBe(200);
    expect(readiness.body.data.score).toBe(analytics.body.data.readiness.score);
    expect(readiness.body.data.factors).toEqual(analytics.body.data.readiness.factors);
    expect(readiness.body.data.disclaimer).toBe(analytics.body.data.readiness.disclaimer);
  });

  it("labels an empty account as uninformed instead of scoring it", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/readiness")
      .set("Cookie", [emptyCookie]);

    expect(res.body.data.score).toBe(0);
    expect(res.body.data.band).toBe("Not enough data yet");
    // Coverage and revision are legitimately zero with no activity.
    const coverage = res.body.data.factors.find(
      (factor: { key: string }) => factor.key === "COVERAGE",
    );
    expect(coverage.value).toBe(0);
    expect(coverage.detail).toContain("0 of");
  });
});

// Runs last: it changes the active account's problem statuses.
describe("agreement with the rest of the app", () => {
  it("reports the same solved total as /progress after a problem is reset", async () => {
    // Resetting a problem clears its status but deliberately keeps its solve history, so
    // analytics must not quietly drop it — otherwise the dashboard and this page would
    // show two different totals for the same activity.
    const reset = await setStatus(activeCookie, easyProblemId, "NOT_STARTED");
    expect(reset.status).toBe(200);

    const [analytics, progress] = await Promise.all([
      request(app).get("/api/v1/analytics").set("Cookie", [activeCookie]),
      request(app).get("/api/v1/progress").set("Cookie", [activeCookie]),
    ]);

    expect(progress.body.data.totals.solved).toBe(2);
    expect(analytics.body.data.totals.solved).toBe(progress.body.data.totals.solved);

    // XP is derived from that same count, so it cannot have shrunk on its own either.
    const solvedSource = analytics.body.data.xp.sources.find(
      (source: { key: string }) => source.key === "PROBLEM_SOLVED",
    );
    expect(solvedSource.count).toBe(progress.body.data.totals.solved);
  });

  it("keeps XP derived from the achievement metrics, so the two cannot disagree", async () => {
    const [xp, achievements] = await Promise.all([
      request(app).get("/api/v1/xp").set("Cookie", [activeCookie]),
      request(app).get("/api/v1/achievements").set("Cookie", [activeCookie]),
    ]);

    const solvedSource = xp.body.data.sources.find(
      (source: { key: string }) => source.key === "PROBLEM_SOLVED",
    );
    const masteredSource = xp.body.data.sources.find(
      (source: { key: string }) => source.key === "PROBLEM_MASTERED",
    );

    // The first-solve badge has a threshold of 1, so an unlocked badge and a zero XP
    // source could never both be true if they read the same numbers.
    const firstSolve = achievements.body.data.achievements.find(
      (row: { key: string }) => row.key === "first-solve",
    );
    expect(firstSolve.unlocked).toBe(true);
    expect(solvedSource.count).toBeGreaterThanOrEqual(firstSolve.threshold);
    expect(masteredSource.count).toBe(0);
  });
});
