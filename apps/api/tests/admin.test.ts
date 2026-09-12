import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { COOKIE_NAMES } from "@dsarats/shared";
import { createApp } from "../src/app";
import { prisma } from "../src/db";

const app = createApp();

const unique = Date.now();
// Short suffix: usernames must stay within the 20-character limit.
const suffix = unique.toString(36);
const password = "strongpass123";
const adminEmail = `admin-test-${unique}@example.com`;
const userEmail = `admin-user-${unique}@example.com`;
const topicSlug = `admin-test-topic-${unique}`;
const sheetSlug = `admin-test-sheet-${unique}`;
const problemSlug = `admin-test-problem-${unique}`;

let adminCookie: string;
let userCookie: string;
let sheetId: string;
let problemId: string;

function extractCookie(res: request.Response, name: string): string | undefined {
  const header = res.headers["set-cookie"];
  if (!header) return undefined;
  const list = Array.isArray(header) ? header : [header];
  const found = list.find((c) => c.startsWith(`${name}=`));
  return found?.split(";")[0];
}

function admin(method: "post" | "patch" | "delete", path: string) {
  return request(app)[method](`/api/v1/admin${path}`).set("Cookie", [adminCookie]);
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [adminEmail, userEmail] } } });

  await request(app).post("/api/v1/auth/register").send({
    email: adminEmail,
    password,
    confirmPassword: password,
    username: `admin_${suffix}`,
  });
  const userRes = await request(app).post("/api/v1/auth/register").send({
    email: userEmail,
    password,
    confirmPassword: password,
    username: `adm_user_${suffix}`,
  });

  // Promote, then log in again so the access token carries the ADMIN role
  // (role travels in the JWT, so the registration token would still say USER).
  await prisma.user.update({ where: { email: adminEmail }, data: { role: "ADMIN" } });
  const login = await request(app).post("/api/v1/auth/login").send({ email: adminEmail, password });

  adminCookie = extractCookie(login, COOKIE_NAMES.ACCESS)!;
  userCookie = extractCookie(userRes, COOKIE_NAMES.ACCESS)!;
  expect(adminCookie).toBeTruthy();
  expect(userCookie).toBeTruthy();
});

afterAll(async () => {
  // Sheet deletion cascades its SheetTopic/SheetProblem rows.
  await prisma.dSASheet.deleteMany({ where: { slug: sheetSlug } });
  await prisma.problem.deleteMany({ where: { slug: problemSlug } });
  await prisma.topic.deleteMany({ where: { slug: topicSlug } });
  await prisma.user.deleteMany({ where: { email: { in: [adminEmail, userEmail] } } });
  await prisma.$disconnect();
});

describe("admin authorization", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const res = await request(app).post("/api/v1/admin/topics").send({ slug: "x", name: "X" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects authenticated non-admins with 403", async () => {
    const res = await request(app)
      .post("/api/v1/admin/topics")
      .set("Cookie", [userCookie])
      .send({ slug: `nope-${unique}`, name: "Nope" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

describe("admin content management", () => {
  it("creates a topic", async () => {
    const res = await admin("post", "/topics").send({
      slug: topicSlug,
      name: "Admin Test Topic",
      description: "Created by the admin route test suite.",
      order: 999,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.topic.slug).toBe(topicSlug);
  });

  it("rejects a duplicate topic slug with 409", async () => {
    const res = await admin("post", "/topics").send({ slug: topicSlug, name: "Duplicate" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
    expect(res.body.error.field).toBe("slug");
  });

  it("creates an unpublished sheet", async () => {
    const res = await admin("post", "/sheets").send({
      slug: sheetSlug,
      name: "Admin Test Sheet",
      description: "Created by the admin route test suite.",
      difficulty: "BEGINNER",
      estimatedHours: 5,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.sheet.isPublished).toBe(false);
    sheetId = res.body.data.sheet.id;
  });

  it("rejects a duplicate sheet slug with 409", async () => {
    const res = await admin("post", "/sheets").send({
      slug: sheetSlug,
      name: "Duplicate Sheet",
      description: "Should conflict with the sheet created above.",
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("rejects a sheet topic ordering that references an unknown topic", async () => {
    const res = await admin("post", `/sheets/${sheetId}/topics`).send({
      topicSlugs: ["no-such-topic-xyz"],
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("sets a sheet's topic ordering", async () => {
    const res = await admin("post", `/sheets/${sheetId}/topics`).send({
      topicSlugs: ["arrays-hashing", "two-pointers"],
    });
    expect(res.status).toBe(200);
    expect(res.body.data.topics).toBe(2);
  });

  it("rejects creating a problem under an unknown topic", async () => {
    const res = await admin("post", "/problems").send({
      slug: `${problemSlug}-other`,
      title: "Orphan",
      topicSlug: "no-such-topic-xyz",
      platformProblemUrl: "https://example.com/orphan",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("creates a problem", async () => {
    const res = await admin("post", "/problems").send({
      slug: problemSlug,
      title: "Admin Test Problem",
      difficulty: "EASY",
      topicSlug,
      pattern: "Hash Map",
      platformProblemUrl: `https://example.com/problems/${problemSlug}`,
      tags: ["test"],
      estimatedMinutes: 10,
      timeComplexityHint: "O(n)",
      spaceComplexityHint: "O(1)",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.problem.slug).toBe(problemSlug);
    problemId = res.body.data.problem.id;
  });

  it("rejects a duplicate problem slug with 409", async () => {
    const res = await admin("post", "/problems").send({
      slug: problemSlug,
      title: "Duplicate",
      topicSlug,
      platformProblemUrl: `https://example.com/problems/${problemSlug}-dup`,
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("adds the problem to the sheet", async () => {
    const res = await admin("post", `/sheets/${sheetId}/problems`).send({
      problemId,
      position: 0,
      isCore: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.sheetProblem.position).toBe(0);
  });

  it("rejects adding the same problem to the sheet twice with 409", async () => {
    const res = await admin("post", `/sheets/${sheetId}/problems`).send({
      problemId,
      position: 1,
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("updates a problem", async () => {
    const res = await admin("patch", `/problems/${problemId}`).send({ title: "Renamed Problem" });
    expect(res.status).toBe(200);
    expect(res.body.data.problem.title).toBe("Renamed Problem");
  });

  it("rejects a non-uuid path param with 400", async () => {
    const res = await admin("patch", "/problems/not-a-uuid").send({ title: "Nope" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("returns 404 when updating a problem that does not exist", async () => {
    const res = await admin("patch", "/problems/11111111-1111-4111-8111-111111111111").send({
      title: "Nope",
    });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("unpublishes a problem instead of deleting it", async () => {
    const res = await admin("delete", `/problems/${problemId}`);
    expect(res.status).toBe(204);

    const stored = await prisma.problem.findUnique({ where: { id: problemId } });
    expect(stored?.isPublished).toBe(false);
  });

  it("hides an unpublished problem from the public list", async () => {
    const res = await request(app).get("/api/v1/problems").query({ q: "Renamed Problem" });
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
  });
});
