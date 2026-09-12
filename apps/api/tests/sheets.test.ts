import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { COOKIE_NAMES } from "@dsarats/shared";

const app = createApp();

const unique = Date.now();
const email = `sheets-test-${unique}@example.com`;
const password = "strongpass123";
const username = `sheets_${unique}`;

function extractCookie(res: request.Response, name: string): string | undefined {
  const header = res.headers["set-cookie"];
  if (!header) return undefined;
  const list = Array.isArray(header) ? header : [header];
  const found = list.find((c) => c.startsWith(`${name}=`));
  return found?.split(";")[0];
}

let access: string;

beforeAll(async () => {
  // Tests are read-only except for this one user account.
  await prisma.user.deleteMany({ where: { email } });
  const res = await request(app).post("/api/v1/auth/register").send({
    email,
    password,
    confirmPassword: password,
    username,
  });
  access = extractCookie(res, COOKIE_NAMES.ACCESS)!;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

describe("GET /api/v1/sheets", () => {
  it("lists published sheets publicly with counts and difficulty distribution", async () => {
    const res = await request(app).get("/api/v1/sheets");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const sheets = res.body.data.sheets as Array<Record<string, unknown>>;
    expect(Array.isArray(sheets)).toBe(true);
    expect(sheets.length).toBeGreaterThan(0);

    const first = sheets[0]!;
    expect(first.slug).toBeTruthy();
    expect(first.name).toBeTruthy();
    expect((first.problemCount as number) >= 0).toBe(true);
    expect(first.difficultyDistribution).toHaveProperty("EASY");
    expect(first.difficultyDistribution).toHaveProperty("MEDIUM");
    expect(first.difficultyDistribution).toHaveProperty("HARD");
    // Anonymous viewer: viewer is null, not absent (stable contract).
    expect(first.viewer).toBeNull();
  });

  it("includes the viewer's sheet status when authenticated", async () => {
    const res = await request(app).get("/api/v1/sheets").set("Cookie", [access]);
    expect(res.status).toBe(200);
    const sheets = res.body.data.sheets as Array<{ viewer: { started: boolean; status: string | null } }>;
    // Not started anything yet.
    expect(sheets.every((s) => s.viewer !== null && s.viewer.started === false)).toBe(true);
  });
});

describe("GET /api/v1/sheets/:slug", () => {
  it("returns 404 for an unknown slug", async () => {
    const res = await request(app).get("/api/v1/sheets/does-not-exist-xyz");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns sheet detail with topic-ordered problem groups (anonymous)", async () => {
    const list = await request(app).get("/api/v1/sheets");
    const { slug } = list.body.data.sheets[0] as { slug: string };

    const res = await request(app).get(`/api/v1/sheets/${slug}`);
    expect(res.status).toBe(200);

    const { sheet, viewer } = res.body.data;
    expect(sheet.slug).toBe(slug);
    expect(sheet.problemCount).toBe(sheet.topics.reduce((sum: number, t: { problems: unknown[] }) => sum + t.problems.length, 0));
    expect(viewer).toBeNull();

    // Positions strictly increasing across the whole sheet (ordered problems).
    const positions: number[] = sheet.topics.flatMap((t: { problems: Array<{ position: number }> }) =>
      t.problems.map((p) => p.position),
    );
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]!).toBeGreaterThan(positions[i - 1]!);
    }
  });

  it("includes sheet-level viewer progress when authenticated", async () => {
    const list = await request(app).get("/api/v1/sheets");
    const { slug } = list.body.data.sheets[0] as { slug: string };

    const res = await request(app).get(`/api/v1/sheets/${slug}`).set("Cookie", [access]);
    expect(res.status).toBe(200);
    expect(res.body.data.viewer).toMatchObject({ started: false, status: null, currentTopicId: null });
  });
});

describe("POST /api/v1/sheets/:slug/start", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const res = await request(app).post("/api/v1/sheets/any-slug/start");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 404 for an unknown sheet", async () => {
    const res = await request(app).post("/api/v1/sheets/does-not-exist-xyz/start").set("Cookie", [access]);
    expect(res.status).toBe(404);
  });

  it("starts the sheet on its first topic", async () => {
    const list = await request(app).get("/api/v1/sheets");
    const { slug } = list.body.data.sheets[0] as { slug: string };

    const detail = await request(app).get(`/api/v1/sheets/${slug}`).set("Cookie", [access]);
    const expectedFirstTopic = detail.body.data.sheet.topics[0]?.id ?? null;

    const res = await request(app).post(`/api/v1/sheets/${slug}/start`).set("Cookie", [access]);
    expect(res.status).toBe(201);
    expect(res.body.data.progress.status).toBe("IN_PROGRESS");
    expect(res.body.data.progress.currentTopicId).toBe(expectedFirstTopic);
  });

  it("is idempotent — starting again returns the same progress with 200", async () => {
    const list = await request(app).get("/api/v1/sheets");
    const { slug } = list.body.data.sheets[0] as { slug: string };

    const res = await request(app).post(`/api/v1/sheets/${slug}/start`).set("Cookie", [access]);
    expect(res.status).toBe(200);
    expect(res.body.data.progress.status).toBe("IN_PROGRESS");
  });

  it("reflects the started sheet in the list's viewer data", async () => {
    const list = await request(app).get("/api/v1/sheets").set("Cookie", [access]);
    const sheets = list.body.data.sheets as Array<{
      slug: string;
      viewer: { started: boolean; status: string | null };
    }>;
    const started = sheets.find((s) => s.viewer.started);
    expect(started).toBeDefined();
    expect(started!.viewer.status).toBe("IN_PROGRESS");
  });
});

describe("POST /api/v1/sheets/:slug/complete-topic", () => {
  it("rejects an invalid topic uuid with 400", async () => {
    const list = await request(app).get("/api/v1/sheets");
    const { slug } = list.body.data.sheets[0] as { slug: string };

    const res = await request(app)
      .post(`/api/v1/sheets/${slug}/complete-topic`)
      .set("Cookie", [access])
      .send({ topicId: "not-a-uuid" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects a topic that is not part of the sheet with 400", async () => {
    const list = await request(app).get("/api/v1/sheets");
    const firstSheet = (list.body.data.sheets as Array<{ slug: string }>)[0];
    if (!firstSheet) return; // no published sheets seeded

    // A well-formed uuid that is not a topic of this sheet: membership check must reject it.
    const res = await request(app)
      .post(`/api/v1/sheets/${firstSheet.slug}/complete-topic`)
      .set("Cookie", [access])
      .send({ topicId: "11111111-1111-4111-8111-111111111111" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("advances currentTopicId to the next topic in sheet order", async () => {
    const list = await request(app).get("/api/v1/sheets");
    const { slug } = list.body.data.sheets[0] as { slug: string };

    const detail = await request(app).get(`/api/v1/sheets/${slug}`).set("Cookie", [access]);
    const topics = detail.body.data.sheet.topics as Array<{ id: string }>;
    if (topics.length < 2) return; // single-topic sheet: nothing to advance to

    const res = await request(app)
      .post(`/api/v1/sheets/${slug}/complete-topic`)
      .set("Cookie", [access])
      .send({ topicId: topics[0]!.id });
    expect(res.status).toBe(200);
    expect(res.body.data.progress.status).toBe("IN_PROGRESS");
    expect(res.body.data.progress.currentTopicId).toBe(topics[1]!.id);
  });

  it("marks the sheet COMPLETED after the final topic", async () => {
    const list = await request(app).get("/api/v1/sheets");
    const { slug } = list.body.data.sheets[0] as { slug: string };

    const detail = await request(app).get(`/api/v1/sheets/${slug}`).set("Cookie", [access]);
    const topics = detail.body.data.sheet.topics as Array<{ id: string }>;

    // Complete every topic in order; the last one completes the sheet.
    for (const topic of topics) {
      const res = await request(app)
        .post(`/api/v1/sheets/${slug}/complete-topic`)
        .set("Cookie", [access])
        .send({ topicId: topic.id });
      expect(res.status).toBe(200);
    }

    const final = await request(app).get(`/api/v1/sheets/${slug}`).set("Cookie", [access]);
    expect(final.body.data.viewer).toMatchObject({
      started: true,
      status: "COMPLETED",
      currentTopicId: null,
    });
  });

  it("returns 404 complete-topic for an unknown sheet", async () => {
    const res = await request(app)
      .post("/api/v1/sheets/does-not-exist-xyz/complete-topic")
      .set("Cookie", [access])
      .send({ topicId: "11111111-1111-4111-8111-111111111111" });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/v1/problems", () => {
  it("lists published problems with cursor pagination", async () => {
    const res = await request(app).get("/api/v1/problems").query({ limit: 2 });
    expect(res.status).toBe(200);

    const { items, nextCursor } = res.body.data;
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(2);
    expect(items[0].slug).toBeTruthy();
    expect(items[0].topic.name).toBeTruthy();

    // Fetch the next page with the cursor.
    if (nextCursor) {
      const page2 = await request(app).get("/api/v1/problems").query({ limit: 2, cursor: nextCursor });
      expect(page2.status).toBe(200);
      const seen = new Set(items.map((p: { id: string }) => p.id));
      for (const p of page2.body.data.items as Array<{ id: string }>) {
        expect(seen.has(p.id)).toBe(false);
      }
    }
  });

  it("filters by difficulty and searches by title", async () => {
    const easy = await request(app).get("/api/v1/problems").query({ difficulty: "EASY" });
    expect(easy.status).toBe(200);
    for (const p of easy.body.data.items as Array<{ difficulty: string }>) {
      expect(p.difficulty).toBe("EASY");
    }

    const searched = await request(app).get("/api/v1/problems").query({ q: "zzz-no-such-problem-zzz" });
    expect(searched.status).toBe(200);
    expect(searched.body.data.items).toHaveLength(0);
  });

  it("returns a problem detail with related problems", async () => {
    const list = await request(app).get("/api/v1/problems").query({ limit: 1 });
    const first = list.body.data.items[0] as { id: string; topic: { slug: string } };

    const res = await request(app).get(`/api/v1/problems/${first.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.problem.id).toBe(first.id);
    expect(Array.isArray(res.body.data.related)).toBe(true);
    for (const rel of res.body.data.related as Array<{ id: string }>) {
      expect(rel.id).not.toBe(first.id);
    }
  });

  it("returns 404 for an unknown problem id (not found)", async () => {
    const res = await request(app).get("/api/v1/problems/11111111-1111-4111-8111-111111111111");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects a non-uuid problem id with 400", async () => {
    const res = await request(app).get("/api/v1/problems/not-a-uuid");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects an invalid query (bad difficulty) with 400", async () => {
    const res = await request(app).get("/api/v1/problems").query({ difficulty: "IMPOSSIBLE" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
