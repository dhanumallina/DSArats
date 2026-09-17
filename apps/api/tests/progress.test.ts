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

const solverEmail = `progress-solver-${unique}@example.com`;
const attempterEmail = `progress-attempter-${unique}@example.com`;
// Deliberately a non-UTC zone (UTC+14) so streaks must use the user's local day.
const SOLVER_TIMEZONE = "Pacific/Kiritimati";

let solverCookie: string;
let attempterCookie: string;
let solverId: string;
let attempterId: string;
let problemId: string;
let problemTopicSlug: string;

function extractCookie(res: request.Response, name: string): string | undefined {
  const header = res.headers["set-cookie"];
  if (!header) return undefined;
  const list = Array.isArray(header) ? header : [header];
  const found = list.find((c) => c.startsWith(`${name}=`));
  return found?.split(";")[0];
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [solverEmail, attempterEmail] } } });

  await request(app).post("/api/v1/auth/register").send({
    email: solverEmail,
    password,
    confirmPassword: password,
    username: `prog_s_${suffix}`,
  });
  await request(app).post("/api/v1/auth/register").send({
    email: attempterEmail,
    password,
    confirmPassword: password,
    username: `prog_a_${suffix}`,
  });

  const solver = await prisma.user.findUniqueOrThrow({ where: { email: solverEmail } });
  const attempter = await prisma.user.findUniqueOrThrow({ where: { email: attempterEmail } });
  solverId = solver.id;
  attempterId = attempter.id;

  await prisma.profile.update({
    where: { userId: solverId },
    data: { timezone: SOLVER_TIMEZONE },
  });

  // Log in after the timezone change so tokens and profile agree.
  const solverLogin = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: solverEmail, password });
  const attempterLogin = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: attempterEmail, password });

  solverCookie = extractCookie(solverLogin, COOKIE_NAMES.ACCESS)!;
  attempterCookie = extractCookie(attempterLogin, COOKIE_NAMES.ACCESS)!;

  const list = await request(app).get("/api/v1/problems").query({ limit: 1 });
  problemId = list.body.data.items[0].id as string;
  problemTopicSlug = list.body.data.items[0].topic.slug as string;
});

afterAll(async () => {
  // Cascades remove UserProblem, ActivityLog, and StreakRecord rows.
  await prisma.user.deleteMany({ where: { email: { in: [solverEmail, attempterEmail] } } });
  await prisma.$disconnect();
});

describe("PATCH /api/v1/problems/:id/progress", () => {
  it("requires authentication", async () => {
    const res = await request(app)
      .patch(`/api/v1/problems/${problemId}/progress`)
      .send({ status: "SOLVED" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects an unknown status with 400", async () => {
    const res = await request(app)
      .patch(`/api/v1/problems/${problemId}/progress`)
      .set("Cookie", [solverCookie])
      .send({ status: "FINISHED" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("returns 404 for a problem that does not exist", async () => {
    const res = await request(app)
      .patch("/api/v1/problems/11111111-1111-4111-8111-111111111111/progress")
      .set("Cookie", [solverCookie])
      .send({ status: "SOLVED" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("marks a problem solved and starts the streak on the user's local day", async () => {
    const res = await request(app)
      .patch(`/api/v1/problems/${problemId}/progress`)
      .set("Cookie", [solverCookie])
      .send({ status: "SOLVED" });

    expect(res.status).toBe(200);
    expect(res.body.data.progress).toMatchObject({
      problemId,
      status: "SOLVED",
      solveCount: 1,
    });
    expect(res.body.data.progress.firstSolvedAt).toBeTruthy();

    const expectedToday = localDateKey(new Date(), SOLVER_TIMEZONE);
    expect(res.body.data.streak).toMatchObject({
      current: 1,
      longest: 1,
      activeToday: true,
      today: expectedToday,
      timezone: SOLVER_TIMEZONE,
    });
  });

  it("is idempotent — repeating the same status adds no activity", async () => {
    const res = await request(app)
      .patch(`/api/v1/problems/${problemId}/progress`)
      .set("Cookie", [solverCookie])
      .send({ status: "SOLVED" });

    expect(res.status).toBe(200);
    expect(res.body.data.progress.solveCount).toBe(1);

    const activities = await prisma.activityLog.count({
      where: { userId: solverId, refId: problemId, type: "PROBLEM_SOLVED" },
    });
    expect(activities).toBe(1);

    const streakRows = await prisma.streakRecord.findMany({ where: { userId: solverId } });
    expect(streakRows).toHaveLength(1);
    expect(streakRows[0]!.problemsSolved).toBe(1);
    expect(streakRows[0]!.activityTypes).toEqual(["PROBLEM_SOLVED"]);
  });

  it("counts a re-solve after marking needs-revision, without moving firstSolvedAt", async () => {
    const before = await prisma.userProblem.findUniqueOrThrow({
      where: { userId_problemId: { userId: solverId, problemId } },
    });

    const flagged = await request(app)
      .patch(`/api/v1/problems/${problemId}/progress`)
      .set("Cookie", [solverCookie])
      .send({ status: "NEEDS_REVISION" });
    expect(flagged.status).toBe(200);
    expect(flagged.body.data.progress.status).toBe("NEEDS_REVISION");
    expect(flagged.body.data.progress.solveCount).toBe(1);

    const resolved = await request(app)
      .patch(`/api/v1/problems/${problemId}/progress`)
      .set("Cookie", [solverCookie])
      .send({ status: "SOLVED" });

    expect(resolved.status).toBe(200);
    expect(resolved.body.data.progress.solveCount).toBe(2);
    expect(resolved.body.data.progress.firstSolvedAt).toBe(
      before.firstSolvedAt!.toISOString(),
    );

    // Both the flagged attempt and the re-solve are logged, but only the solve keeps
    // the streak day alive.
    const types = await prisma.activityLog.findMany({
      where: { userId: solverId, refId: problemId },
      select: { type: true },
      orderBy: { occurredAt: "asc" },
    });
    expect(types.map((t) => t.type)).toEqual([
      "PROBLEM_SOLVED",
      "PROBLEM_ATTEMPTED",
      "PROBLEM_SOLVED",
    ]);

    const streakRow = await prisma.streakRecord.findFirstOrThrow({
      where: { userId: solverId },
    });
    expect(streakRow.problemsSolved).toBe(2);
    // Still a single streak day — many actions on one day never double-count.
    expect(await prisma.streakRecord.count({ where: { userId: solverId } })).toBe(1);
  });

  it("does not give a streak day for an attempt alone", async () => {
    const res = await request(app)
      .patch(`/api/v1/problems/${problemId}/progress`)
      .set("Cookie", [attempterCookie])
      .send({ status: "ATTEMPTED" });

    expect(res.status).toBe(200);
    expect(res.body.data.progress).toMatchObject({ status: "ATTEMPTED", solveCount: 0 });
    expect(res.body.data.streak).toMatchObject({ current: 0, activeToday: false });

    expect(
      await prisma.activityLog.count({ where: { userId: attempterId, type: "PROBLEM_ATTEMPTED" } }),
    ).toBe(1);
    expect(await prisma.streakRecord.count({ where: { userId: attempterId } })).toBe(0);
  });
});

describe("GET /api/v1/problems/:id viewer progress", () => {
  it("includes the viewer's status for the authenticated user", async () => {
    const res = await request(app)
      .get(`/api/v1/problems/${problemId}`)
      .set("Cookie", [solverCookie]);

    expect(res.status).toBe(200);
    expect(res.body.data.viewer).toMatchObject({ status: "SOLVED", solveCount: 2 });
  });

  it("keeps each user's progress separate", async () => {
    const res = await request(app)
      .get(`/api/v1/problems/${problemId}`)
      .set("Cookie", [attempterCookie]);

    expect(res.status).toBe(200);
    expect(res.body.data.viewer).toMatchObject({ status: "ATTEMPTED", solveCount: 0 });
  });

  it("returns a null viewer for anonymous requests", async () => {
    const res = await request(app).get(`/api/v1/problems/${problemId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.viewer).toBeNull();
  });
});

describe("GET /api/v1/progress", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/progress");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("summarizes the solver's progress by status, difficulty, topic, and sheet", async () => {
    const res = await request(app).get("/api/v1/progress").set("Cookie", [solverCookie]);

    expect(res.status).toBe(200);
    const { totals, byStatus, byDifficulty, byTopic, bySheet } = res.body.data;

    expect(totals.publishedProblems).toBeGreaterThan(0);
    expect(totals.solved).toBe(1);
    expect(totals.attempted).toBe(0);
    expect(totals.notStarted).toBe(totals.publishedProblems - 1);
    expect(byStatus.SOLVED).toBe(1);

    // Difficulty buckets partition the published catalog, on both axes.
    expect(
      byDifficulty.EASY.total + byDifficulty.MEDIUM.total + byDifficulty.HARD.total,
    ).toBe(totals.publishedProblems);
    expect(byDifficulty.EASY.solved + byDifficulty.MEDIUM.solved + byDifficulty.HARD.solved).toBe(1);

    const topic = byTopic.find((t: { topic: { slug: string } }) => t.topic.slug === problemTopicSlug);
    expect(topic).toBeTruthy();
    expect(topic.solved).toBe(1);

    expect(Array.isArray(bySheet)).toBe(true);
    expect(bySheet.every((s: { status: string }) => s.status === "NOT_STARTED")).toBe(true);
  });

  it("keeps each user's summary isolated", async () => {
    const res = await request(app).get("/api/v1/progress").set("Cookie", [attempterCookie]);

    expect(res.status).toBe(200);
    expect(res.body.data.totals.solved).toBe(0);
    expect(res.body.data.totals.attempted).toBe(1);
    expect(res.body.data.byStatus.ATTEMPTED).toBe(1);
    expect(res.body.data.byStatus.SOLVED).toBe(0);
  });
});

describe("GET /api/v1/progress/heatmap", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/progress/heatmap");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns the solver's activity days for the current local year by default", async () => {
    const res = await request(app)
      .get("/api/v1/progress/heatmap")
      .set("Cookie", [solverCookie]);

    expect(res.status).toBe(200);
    const today = localDateKey(new Date(), SOLVER_TIMEZONE);

    expect(res.body.data.year).toBe(Number(today.slice(0, 4)));
    expect(res.body.data.timezone).toBe(SOLVER_TIMEZONE);
    expect(res.body.data.activeDays).toBe(1);
    expect(res.body.data.totalSolved).toBe(2);
    expect(res.body.data.maxCount).toBeGreaterThanOrEqual(2);
    expect(res.body.data.days).toHaveLength(1);
    expect(res.body.data.days[0]).toMatchObject({
      date: today,
      problemsSolved: 2,
      activityTypes: ["PROBLEM_SOLVED"],
    });
  });

  it("returns only that year's activity for an explicit year", async () => {
    const res = await request(app)
      .get("/api/v1/progress/heatmap")
      .query({ year: 2000 })
      .set("Cookie", [solverCookie]);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ year: 2000, activeDays: 0, totalSolved: 0, maxCount: 0 });
    expect(res.body.data.days).toEqual([]);
  });

  it("rejects a non-numeric year with 400", async () => {
    const res = await request(app)
      .get("/api/v1/progress/heatmap")
      .query({ year: "soon" })
      .set("Cookie", [solverCookie]);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});

describe("GET /api/v1/sheets/:slug per-problem viewer status", () => {
  it("exposes each problem's status to the authenticated viewer only", async () => {
    const list = await request(app).get("/api/v1/sheets");
    const slug = (list.body.data.sheets as Array<{ slug: string }>)[0]?.slug;
    if (!slug) return; // no published sheets seeded

    const anon = await request(app).get(`/api/v1/sheets/${slug}`);
    const anonProblem = anon.body.data.sheet.topics[0]?.problems[0];
    if (!anonProblem) return; // sheet has no problems
    expect(anonProblem.viewerStatus).toBeNull();

    const solved = await request(app)
      .patch(`/api/v1/problems/${anonProblem.id}/progress`)
      .set("Cookie", [solverCookie])
      .send({ status: "SOLVED" });
    expect(solved.status).toBe(200);

    const authed = await request(app).get(`/api/v1/sheets/${slug}`).set("Cookie", [solverCookie]);
    const row = authed.body.data.sheet.topics
      .flatMap((topic: { problems: Array<{ id: string; viewerStatus: string | null }> }) => topic.problems)
      .find((problem: { id: string }) => problem.id === anonProblem.id);

    expect(row.viewerStatus).toBe("SOLVED");
  });
});
