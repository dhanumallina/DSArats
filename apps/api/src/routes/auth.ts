import { Router, type Response } from "express";
import { COOKIE_NAMES, loginSchema, registerSchema } from "@dsarats/shared";
import type { AuthedRequest } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { isProduction } from "../config";
import { prisma } from "../db";
import {
  ApiError,
  loginUser,
  refreshSession,
  registerUser,
  revokeSession,
  toPublicUser,
  userWithProfile,
} from "../services/auth.service";
import { sendOk } from "../utils/response";

const router = Router();

const cookieOptions = (maxAgeMs: number, path: string) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path,
  maxAge: maxAgeMs,
});

const ACCESS_MAX_AGE = 15 * 60 * 1000; // 15m
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30d

// The refresh token is only ever needed by the auth endpoints, so scope its cookie
// to /api/v1/auth — it won't be sent along with every other API request.
const REFRESH_COOKIE_PATH = "/api/v1/auth";

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(COOKIE_NAMES.ACCESS, accessToken, cookieOptions(ACCESS_MAX_AGE, "/"));
  res.cookie(COOKIE_NAMES.REFRESH, refreshToken, cookieOptions(REFRESH_MAX_AGE, REFRESH_COOKIE_PATH));
}

function clearAuthCookies(res: Response) {
  res.clearCookie(COOKIE_NAMES.ACCESS, { httpOnly: true, secure: isProduction, sameSite: "lax", path: "/" });
  res.clearCookie(COOKIE_NAMES.REFRESH, { httpOnly: true, secure: isProduction, sameSite: "lax", path: REFRESH_COOKIE_PATH });
}

function requestMeta(req: AuthedRequest) {
  return {
    userAgent: req.headers["user-agent"],
    ip: req.ip ?? req.socket.remoteAddress,
  };
}

/** POST /auth/register */
router.post("/register", validate({ body: registerSchema }), async (req: AuthedRequest, res) => {
  const { accessToken, refreshToken, user } = await registerUser(req.body, requestMeta(req));
  setAuthCookies(res, accessToken, refreshToken);
  sendOk(res, { user }, 201);
});

/** POST /auth/login */
router.post("/login", validate({ body: loginSchema }), async (req: AuthedRequest, res) => {
  const { accessToken, refreshToken, user } = await loginUser(req.body, requestMeta(req));
  setAuthCookies(res, accessToken, refreshToken);
  sendOk(res, { user });
});

/** POST /auth/logout */
router.post("/logout", async (req: AuthedRequest, res) => {
  const refreshToken = (req.cookies as Record<string, string | undefined>)[COOKIE_NAMES.REFRESH];
  if (refreshToken) {
    await revokeSession(refreshToken).catch(() => undefined);
  }
  clearAuthCookies(res);
  res.status(204).end();
});

/** POST /auth/refresh — rotate the refresh token, mint a new access token. */
router.post("/refresh", async (req: AuthedRequest, res) => {
  const refreshToken = (req.cookies as Record<string, string | undefined>)[COOKIE_NAMES.REFRESH];
  if (!refreshToken) {
    throw new ApiError(401, "UNAUTHENTICATED", "Session expired. Please log in again.");
  }
  const { accessToken, refreshToken: nextRefresh, user } = await refreshSession(refreshToken, requestMeta(req));
  setAuthCookies(res, accessToken, nextRefresh);
  sendOk(res, { user });
});

/** GET /auth/me */
router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: userWithProfile,
  });
  if (!user) {
    throw new ApiError(404, "NOT_FOUND", "User not found");
  }
  sendOk(res, { user: toPublicUser(user) });
});

export default router;