import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { COOKIE_NAMES } from "@dsarats/shared";

const app = createApp();

const unique = Date.now();
const email = `auth-test-${unique}@example.com`;
const password = "strongpass123";
const username = `tester_${unique}`;

function extractCookie(res: request.Response, name: string): string | undefined {
  const header = res.headers["set-cookie"];
  if (!header) return undefined;
  const list = Array.isArray(header) ? header : [header];
  const found = list.find((c) => c.startsWith(`${name}=`));
  return found?.split(";")[0];
}

beforeAll(async () => {
  // Clean any leftovers from a previous failed run of the same test.
  await prisma.user.deleteMany({ where: { email } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

describe("POST /api/v1/auth/register", () => {
  it("creates an account and sets auth cookies", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email,
      password,
      confirmPassword: password,
      username,
      displayName: "Auth Test",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.profile.username).toBe(username);
    expect(res.body.data.user.emailVerified).toBe(false);

    expect(extractCookie(res, COOKIE_NAMES.ACCESS)).toBeDefined();
    expect(extractCookie(res, COOKIE_NAMES.REFRESH)).toBeDefined();
  });

  it("rejects a duplicate email with 409 CONFLICT", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email,
      password,
      confirmPassword: password,
      username: `other_${unique}`,
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
    expect(res.body.error.field).toBe("email");
  });

  it("rejects a duplicate username with 409 CONFLICT", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: `other-${unique}@example.com`,
      password,
      confirmPassword: password,
      username,
    });
    expect(res.status).toBe(409);
    expect(res.body.error.field).toBe("username");
  });

  it("returns 400 VALIDATION_FAILED for a bad payload", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "nope",
      password: "x",
      confirmPassword: "y",
      username: "a",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.field).toBeDefined();
  });
});

describe("POST /api/v1/auth/login", () => {
  it("logs in with correct credentials", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(email);
    expect(extractCookie(res, COOKIE_NAMES.ACCESS)).toBeDefined();
  });

  it("rejects a wrong password with 401 INVALID_CREDENTIALS", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email, password: "wrongpass123" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects unknown email with 401 INVALID_CREDENTIALS (no account enumeration)", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "does-not-exist@example.com",
      password: "whatever123",
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });
});

describe("GET /api/v1/auth/me", () => {
  it("returns the current user with a valid access cookie", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ email, password });
    const access = extractCookie(login, COOKIE_NAMES.ACCESS)!;

    const res = await request(app).get("/api/v1/auth/me").set("Cookie", [access]);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.profile.username).toBe(username);
  });

  it("rejects a missing token with 401", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects a garbage token with 401", async () => {
    const res = await request(app).get("/api/v1/auth/me").set("Cookie", [`${COOKIE_NAMES.ACCESS}=garbage`]);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/auth/refresh", () => {
  it("rotates the refresh token and returns a new access token", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ email, password });
    const oldRefresh = extractCookie(login, COOKIE_NAMES.REFRESH)!;

    const res = await request(app).post("/api/v1/auth/refresh").set("Cookie", [oldRefresh]);
    expect(res.status).toBe(200);
    expect(extractCookie(res, COOKIE_NAMES.ACCESS)).toBeDefined();

    const newRefresh = extractCookie(res, COOKIE_NAMES.REFRESH);
    expect(newRefresh).toBeDefined();
    expect(newRefresh).not.toBe(oldRefresh);
  });

  it("rejects a revoked (reused) refresh token with 401", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ email, password });
    const refresh = extractCookie(login, COOKIE_NAMES.REFRESH)!;

    // First use rotates it away...
    await request(app).post("/api/v1/auth/refresh").set("Cookie", [refresh]);

    // Second use of the same token must fail (reuse detection).
    const res = await request(app).post("/api/v1/auth/refresh").set("Cookie", [refresh]);
    expect(res.status).toBe(401);
  });

  it("revokes the whole family when a used refresh token is replayed (reuse detection)", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ email, password });
    const stolen = extractCookie(login, COOKIE_NAMES.REFRESH)!;

    // Attacker replays the stolen token and rotates it.
    const attack = await request(app).post("/api/v1/auth/refresh").set("Cookie", [stolen]);
    expect(attack.status).toBe(200);
    const attackerRefresh = extractCookie(attack, COOKIE_NAMES.REFRESH)!;

    // Legit user reuses the (now-stale) original token — reuse detected.
    const replay = await request(app).post("/api/v1/auth/refresh").set("Cookie", [stolen]);
    expect(replay.status).toBe(401);

    // The attacker's rotated token must also be dead: the whole family is revoked.
    const afterFamilyRevoke = await request(app).post("/api/v1/auth/refresh").set("Cookie", [attackerRefresh]);
    expect(afterFamilyRevoke.status).toBe(401);
  });

  it("rejects a missing refresh token with 401", async () => {
    const res = await request(app).post("/api/v1/auth/refresh");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("revokes the session and clears cookies", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ email, password });
    const refresh = extractCookie(login, COOKIE_NAMES.REFRESH)!;

    const res = await request(app).post("/api/v1/auth/logout").set("Cookie", [refresh]);
    expect(res.status).toBe(204);

    // The refresh token must no longer work.
    const refreshRes = await request(app).post("/api/v1/auth/refresh").set("Cookie", [refresh]);
    expect(refreshRes.status).toBe(401);
  });
});

describe("GET /api/health", () => {
  it("reports healthy with a live DB connection", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
  });

  it("returns 404 for unknown routes", async () => {
    const res = await request(app).get("/api/v1/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});