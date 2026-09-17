import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { COOKIE_NAMES, REVISION_INTERVALS_DAYS, REVISION_MAX_STAGE } from "@dsarats/shared";
import { createApp } from "../src/app";
import { prisma } from "../src/db";

const app = createApp();

const unique = Date.now();
const suffix = unique.toString(36);
const password = "strongpass123";
const TIMEZONE = "Asia/Kolkata";
const DAY_MS = 24 * 60 * 60 * 1000;

const mainEmail = `revision-main-${unique}@example.com`;
const peerEmail = `revision-peer-${unique}@example.com`;

let mainId: string;
let mainCookie: string;
let peerCookie: string;
/** p0: full schedule lifecycle · p1: mastered · p2: notes. */
let problemIds: string[];

const UNKNOWN_PROBLEM = "11111111-1111-4111-8111-111111111111";
const UNSCHEDULED_PROBLEM = "22222222-2222-4222-8222-222222222222";

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
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.profile.update({ where: { userId: user.id }, data: { timezone: TIMEZONE } });
  const login = await request(app).post("/api/v1/auth/login").send({ email, password });
  return { id: user.id, cookie: extractCookie(login, COOKIE_NAMES.ACCESS)! };
}

function setStatus(cookie: string, problemId: string, status: string) {
  return request(app)
    .patch(`/api/v1/problems/${problemId}/progress`)
    .set("Cookie", [cookie])
    .send({ status });
}

function completeRevision(cookie: string, problemId: string, body: Record<string, unknown> = {}) {
  return request(app)
    .post(`/api/v1/revision/${problemId}/complete`)
    .set("Cookie", [cookie])
    .send(body);
}

/** The gap in days between a returned dueAt and now (allowing scheduling latency). */
function daysFromNow(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / DAY_MS;
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [mainEmail, peerEmail] } } });

  const [main, peer] = await Promise.all([
    registerUser(mainEmail, `rev_m_${suffix}`),
    registerUser(peerEmail, `rev_p_${suffix}`),
  ]);
  mainId = main.id;
  mainCookie = main.cookie;
  peerCookie = peer.cookie;

  const list = await request(app).get("/api/v1/problems").query({ limit: 3 });
  problemIds = (list.body.data.items as Array<{ id: string }>).map((item) => item.id);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [mainEmail, peerEmail] } } });
  await prisma.$disconnect();
});

describe("revision scheduling on solve", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/revision");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("schedules a problem for revision when it is solved", async () => {
    const res = await setStatus(mainCookie, problemIds[0]!, "SOLVED");
    expect(res.status).toBe(200);

    const schedule = await prisma.revisionSchedule.findUniqueOrThrow({
      where: { userId_problemId: { userId: mainId, problemId: problemIds[0]! } },
    });
    expect(schedule.stage).toBe(0);
    expect(schedule.timesReviewed).toBe(0);
    expect(schedule.lastReviewedAt).toBeNull();
    // Stage 0 → due at +1 day.
    expect(daysFromNow(schedule.dueAt.toISOString())).toBeGreaterThan(0.9);
    expect(daysFromNow(schedule.dueAt.toISOString())).toBeLessThan(1.1);
  });

  it("does not show a not-yet-due item in the due queue", async () => {
    const res = await request(app).get("/api/v1/revision").set("Cookie", [mainCookie]);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.dueCount).toBe(0);
    expect(res.body.data.scheduledCount).toBe(1);
  });

  it("shows the scheduled item when due=false", async () => {
    const res = await request(app)
      .get("/api/v1/revision")
      .query({ due: "false" })
      .set("Cookie", [mainCookie]);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0]).toMatchObject({
      problemId: problemIds[0],
      stage: 0,
      timesReviewed: 0,
      daysOverdue: 0,
      difficultyAfterRevision: null,
    });
    expect(res.body.data.items[0].problem.title).toBeTruthy();
  });
});

describe("revision due queue", () => {
  it("reports overdue items with their overdue age", async () => {
    // Backdate the schedule so it becomes due.
    await prisma.revisionSchedule.update({
      where: { userId_problemId: { userId: mainId, problemId: problemIds[0]! } },
      data: { dueAt: new Date(Date.now() - 3 * DAY_MS) },
    });

    const res = await request(app).get("/api/v1/revision").set("Cookie", [mainCookie]);
    expect(res.status).toBe(200);
    expect(res.body.data.dueCount).toBe(1);
    expect(res.body.data.items[0].problemId).toBe(problemIds[0]);
    expect(res.body.data.items[0].daysOverdue).toBeGreaterThanOrEqual(3);
  });

  it("keeps each user's queue isolated", async () => {
    const res = await request(app).get("/api/v1/revision").set("Cookie", [peerCookie]);
    expect(res.status).toBe(200);
    expect(res.body.data.dueCount).toBe(0);
    expect(res.body.data.scheduledCount).toBe(0);
  });
});

describe("completing a revision", () => {
  it("advances the stage, records the rating, and counts toward the streak", async () => {
    const res = await completeRevision(mainCookie, problemIds[0]!, {
      difficultyAfterRevision: "EASIER",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.item).toMatchObject({
      problemId: problemIds[0],
      stage: 1,
      timesReviewed: 1,
      difficultyAfterRevision: "EASIER",
    });
    // Stage 1 → due at +3 days.
    expect(daysFromNow(res.body.data.item.dueAt)).toBeGreaterThan(2.9);
    expect(daysFromNow(res.body.data.item.dueAt)).toBeLessThan(3.1);
    expect(res.body.data.streak).toMatchObject({ current: 1, activeToday: true });

    const userProblem = await prisma.userProblem.findUniqueOrThrow({
      where: { userId_problemId: { userId: mainId, problemId: problemIds[0]! } },
    });
    expect(userProblem.status).toBe("REVISED");
    expect(userProblem.difficultyAfterRevision).toBe("EASIER");
    expect(userProblem.lastRevisionAt).not.toBeNull();

    expect(
      await prisma.activityLog.count({
        where: { userId: mainId, refId: problemIds[0], type: "REVISION_COMPLETED" },
      }),
    ).toBe(1);
  });

  it("advances again without clearing an existing rating", async () => {
    const res = await completeRevision(mainCookie, problemIds[0]!);
    expect(res.status).toBe(200);
    expect(res.body.data.item).toMatchObject({ stage: 2, timesReviewed: 2, difficultyAfterRevision: "EASIER" });
    // Stage 2 → due at +7 days.
    expect(daysFromNow(res.body.data.item.dueAt)).toBeGreaterThan(6.9);
    expect(daysFromNow(res.body.data.item.dueAt)).toBeLessThan(7.1);
  });

  it("keeps an existing schedule when the problem is re-solved", async () => {
    const res = await setStatus(mainCookie, problemIds[0]!, "SOLVED");
    expect(res.status).toBe(200);

    const schedule = await prisma.revisionSchedule.findUniqueOrThrow({
      where: { userId_problemId: { userId: mainId, problemId: problemIds[0]! } },
    });
    // A re-solve must not restart the cycle at stage 0.
    expect(schedule.stage).toBe(2);
  });

  it("caps the stage at the final 30-day interval", async () => {
    for (let i = 0; i < 5; i += 1) {
      const res = await completeRevision(mainCookie, problemIds[0]!);
      expect(res.status).toBe(200);
      expect(res.body.data.item.stage).toBeLessThanOrEqual(REVISION_MAX_STAGE);
    }

    const res = await request(app)
      .get("/api/v1/revision")
      .query({ due: "false" })
      .set("Cookie", [mainCookie]);
    const item = res.body.data.items.find(
      (row: { problemId: string }) => row.problemId === problemIds[0],
    );
    expect(item.stage).toBe(REVISION_MAX_STAGE);
    // The final interval repeats rather than growing.
    expect(daysFromNow(item.dueAt)).toBeGreaterThan(REVISION_INTERVALS_DAYS[REVISION_MAX_STAGE]! - 0.1);
    expect(daysFromNow(item.dueAt)).toBeLessThan(REVISION_INTERVALS_DAYS[REVISION_MAX_STAGE]! + 0.1);
  });

  it("returns 404 when the problem is not scheduled for revision", async () => {
    const res = await completeRevision(mainCookie, UNSCHEDULED_PROBLEM);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("archives the schedule when a problem is mastered without losing its history", async () => {
    await setStatus(mainCookie, problemIds[1]!, "SOLVED");
    // Review once first so there is real history worth preserving.
    const reviewed = await completeRevision(mainCookie, problemIds[1]!, {
      difficultyAfterRevision: "SAME",
    });
    expect(reviewed.status).toBe(200);

    const mastered = await setStatus(mainCookie, problemIds[1]!, "MASTERED");
    expect(mastered.status).toBe(200);

    const schedule = await prisma.revisionSchedule.findUniqueOrThrow({
      where: { userId_problemId: { userId: mainId, problemId: problemIds[1]! } },
    });
    expect(schedule.archivedAt).not.toBeNull();

    // Gone from the actionable queue...
    const queue = await request(app)
      .get("/api/v1/revision")
      .query({ due: "false" })
      .set("Cookie", [mainCookie]);
    expect(
      queue.body.data.items.some(
        (item: { problemId: string }) => item.problemId === problemIds[1],
      ),
    ).toBe(false);

    // ...but the completed review is still in the user's history.
    const history = await request(app)
      .get("/api/v1/revision/history")
      .query({ limit: 50 })
      .set("Cookie", [mainCookie]);
    expect(
      history.body.data.items.some(
        (item: { problemId: string }) => item.problemId === problemIds[1],
      ),
    ).toBe(true);

    // A mastered problem is no longer revisable.
    const res = await completeRevision(mainCookie, problemIds[1]!);
    expect(res.status).toBe(404);
  });

  it("starts a fresh cycle when a mastered problem is solved again", async () => {
    const res = await setStatus(mainCookie, problemIds[1]!, "SOLVED");
    expect(res.status).toBe(200);

    const schedule = await prisma.revisionSchedule.findUniqueOrThrow({
      where: { userId_problemId: { userId: mainId, problemId: problemIds[1]! } },
    });
    expect(schedule.archivedAt).toBeNull();
    expect(schedule.stage).toBe(0);
    expect(daysFromNow(schedule.dueAt.toISOString())).toBeGreaterThan(0.9);
    expect(daysFromNow(schedule.dueAt.toISOString())).toBeLessThan(1.1);

    const queue = await request(app)
      .get("/api/v1/revision")
      .query({ due: "false" })
      .set("Cookie", [mainCookie]);
    expect(
      queue.body.data.items.some(
        (item: { problemId: string }) => item.problemId === problemIds[1],
      ),
    ).toBe(true);
  });

  it("keeps stage and timesReviewed consistent when two reviews race", async () => {
    const before = await prisma.revisionSchedule.findUniqueOrThrow({
      where: { userId_problemId: { userId: mainId, problemId: problemIds[1]! } },
    });

    const [a, b] = await Promise.all([
      completeRevision(mainCookie, problemIds[1]!),
      completeRevision(mainCookie, problemIds[1]!),
    ]);

    // Each request either reviews or is rejected as a conflict — never a silent no-op.
    for (const res of [a, b]) {
      expect([200, 409]).toContain(res.status);
    }
    const successes = [a, b].filter((res) => res.status === 200).length;
    expect(successes).toBeGreaterThanOrEqual(1);

    const after = await prisma.revisionSchedule.findUniqueOrThrow({
      where: { userId_problemId: { userId: mainId, problemId: problemIds[1]! } },
    });
    // No lost update: the stage advanced once per successful review.
    expect(after.timesReviewed).toBe(before.timesReviewed + successes);
    expect(after.stage).toBe(Math.min(before.stage + successes, REVISION_MAX_STAGE));
    expect(after.archivedAt).toBeNull();
  });

  it("restarts the interval when the problem was flagged for revision", async () => {
    await setStatus(mainCookie, problemIds[2]!, "SOLVED");
    // Flagging keeps the schedule in place (no reset, no deletion).
    await setStatus(mainCookie, problemIds[2]!, "NEEDS_REVISION");
    const scheduled = await prisma.revisionSchedule.findUniqueOrThrow({
      where: { userId_problemId: { userId: mainId, problemId: problemIds[2]! } },
    });
    expect(scheduled.stage).toBe(0);

    const res = await completeRevision(mainCookie, problemIds[2]!);
    expect(res.status).toBe(200);
    // Restart, not advance: the 1-day interval begins again.
    expect(res.body.data.item.stage).toBe(0);
    expect(res.body.data.item.timesReviewed).toBe(1);
    expect(daysFromNow(res.body.data.item.dueAt)).toBeGreaterThan(0.9);
    expect(daysFromNow(res.body.data.item.dueAt)).toBeLessThan(1.1);
  });

  it("hides unpublished problems from the actionable queue", async () => {
    const scheduled = () =>
      request(app)
        .get("/api/v1/revision")
        .query({ due: "false" })
        .set("Cookie", [mainCookie])
        .then((res) =>
          res.body.data.items.some(
            (item: { problemId: string }) => item.problemId === problemIds[2],
          ),
        );

    expect(await scheduled()).toBe(true);

    try {
      await prisma.problem.update({ where: { id: problemIds[2]! }, data: { isPublished: false } });
      // An unpublished problem can no longer be opened, so it must not be queued.
      expect(await scheduled()).toBe(false);
    } finally {
      await prisma.problem.update({ where: { id: problemIds[2]! }, data: { isPublished: true } });
    }
  });
});

describe("GET /api/v1/revision/history", () => {
  it("lists completed revisions for the user, newest first", async () => {
    const res = await request(app).get("/api/v1/revision/history").set("Cookie", [mainCookie]);
    expect(res.status).toBe(200);

    expect(res.body.data.items.length).toBeGreaterThan(0);
    const item = res.body.data.items.find(
      (row: { problemId: string }) => row.problemId === problemIds[0],
    );
    expect(item).toMatchObject({ difficultyAfterRevision: "EASIER" });
    expect(item.lastReviewedAt).toBeTruthy();
    expect(item.problem.title).toBeTruthy();
  });

  it("returns nothing for a user who has never revised", async () => {
    const res = await request(app).get("/api/v1/revision/history").set("Cookie", [peerCookie]);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.nextCursor).toBeNull();
  });

  it("rejects an invalid cursor with 400", async () => {
    const res = await request(app)
      .get("/api/v1/revision/history")
      .query({ cursor: "not-a-cursor" })
      .set("Cookie", [mainCookie]);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});

describe("problem notes", () => {
  const notesProblem = () => problemIds[2]!;

  it("requires authentication", async () => {
    const res = await request(app).get(`/api/v1/problems/${notesProblem()}/notes`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 404 for an unknown problem", async () => {
    const res = await request(app)
      .get(`/api/v1/problems/${UNKNOWN_PROBLEM}/notes`)
      .set("Cookie", [mainCookie]);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns null before a note is written", async () => {
    const res = await request(app)
      .get(`/api/v1/problems/${notesProblem()}/notes`)
      .set("Cookie", [mainCookie]);
    expect(res.status).toBe(200);
    expect(res.body.data.note).toBeNull();
  });

  it("creates a note from a partial body", async () => {
    const res = await request(app)
      .put(`/api/v1/problems/${notesProblem()}/notes`)
      .set("Cookie", [mainCookie])
      .send({ approach: "Two pointers from both ends." });

    expect(res.status).toBe(200);
    expect(res.body.data.note).toMatchObject({
      problemId: notesProblem(),
      approach: "Two pointers from both ends.",
      mistakes: null,
      keyPatterns: null,
    });
  });

  it("updates only the fields present, leaving the rest intact", async () => {
    const res = await request(app)
      .put(`/api/v1/problems/${notesProblem()}/notes`)
      .set("Cookie", [mainCookie])
      .send({ mistakes: "Forgot the duplicate case." });

    expect(res.status).toBe(200);
    expect(res.body.data.note.approach).toBe("Two pointers from both ends.");
    expect(res.body.data.note.mistakes).toBe("Forgot the duplicate case.");
  });

  it("clears a field with null without touching the others", async () => {
    const res = await request(app)
      .put(`/api/v1/problems/${notesProblem()}/notes`)
      .set("Cookie", [mainCookie])
      .send({ mistakes: null });

    expect(res.status).toBe(200);
    expect(res.body.data.note.mistakes).toBeNull();
    expect(res.body.data.note.approach).toBe("Two pointers from both ends.");
  });

  it("persists across requests", async () => {
    const res = await request(app)
      .get(`/api/v1/problems/${notesProblem()}/notes`)
      .set("Cookie", [mainCookie]);
    expect(res.status).toBe(200);
    expect(res.body.data.note.approach).toBe("Two pointers from both ends.");
  });

  it("rejects an over-long field with 400", async () => {
    const res = await request(app)
      .put(`/api/v1/problems/${notesProblem()}/notes`)
      .set("Cookie", [mainCookie])
      .send({ approach: "x".repeat(20_001) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects an unknown field with 400", async () => {
    const res = await request(app)
      .put(`/api/v1/problems/${notesProblem()}/notes`)
      .set("Cookie", [mainCookie])
      .send({ solution: "not a notebook field" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("returns 404 when writing a note for an unknown problem", async () => {
    const res = await request(app)
      .put(`/api/v1/problems/${UNKNOWN_PROBLEM}/notes`)
      .set("Cookie", [mainCookie])
      .send({ approach: "nope" });
    expect(res.status).toBe(404);
  });

  it("keeps notebooks private to each user", async () => {
    const res = await request(app)
      .get(`/api/v1/problems/${notesProblem()}/notes`)
      .set("Cookie", [peerCookie]);
    expect(res.status).toBe(200);
    expect(res.body.data.note).toBeNull();
  });
});

describe("revision state on problem detail", () => {
  const scheduledProblem = () => problemIds[2]!;

  it("includes the viewer's live revision state", async () => {
    const res = await request(app)
      .get(`/api/v1/problems/${scheduledProblem()}`)
      .set("Cookie", [mainCookie]);

    expect(res.status).toBe(200);
    expect(res.body.data.viewer.status).toBe("REVISED");
    expect(res.body.data.revision).toMatchObject({
      stage: 0,
      timesReviewed: 1,
      daysOverdue: 0,
    });
    expect(res.body.data.revision.dueAt).toBeTruthy();
    expect(res.body.data.revision.lastReviewedAt).toBeTruthy();
  });

  it("omits revision state for an anonymous viewer", async () => {
    const res = await request(app).get(`/api/v1/problems/${scheduledProblem()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.viewer).toBeNull();
    expect(res.body.data.revision).toBeNull();
  });

  it("stops reporting revision state once the problem is mastered", async () => {
    const mastered = await setStatus(mainCookie, scheduledProblem(), "MASTERED");
    expect(mastered.status).toBe(200);

    const res = await request(app)
      .get(`/api/v1/problems/${scheduledProblem()}`)
      .set("Cookie", [mainCookie]);

    // The status is still reported, but the archived schedule is not live state.
    expect(res.body.data.viewer.status).toBe("MASTERED");
    expect(res.body.data.revision).toBeNull();
  });
});
