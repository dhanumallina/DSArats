import type { NextFunction, Request, Response } from "express";
import { COOKIE_NAMES, ERROR_CODES, USER_ROLE } from "@dsarats/shared";
import { verifyAccessToken } from "../utils/tokens";
import { sendFail } from "../utils/response";

export interface AuthedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "USER" | "ADMIN";
  };
}

/** Require a valid access token (JWT from httpOnly cookie). Populates req.user. */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  const token = (req.cookies as Record<string, string | undefined>)[COOKIE_NAMES.ACCESS];
  if (!token) {
    sendFail(res, 401, { code: ERROR_CODES.UNAUTHENTICATED, message: "Authentication required" });
    return;
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    sendFail(res, 401, { code: ERROR_CODES.UNAUTHENTICATED, message: "Invalid or expired session" });
    return;
  }

  req.user = { id: payload.sub, email: payload.email, role: payload.role };
  next();
}

/**
 * Attach req.user when a valid access cookie is present; never fails.
 * Lets public endpoints (sheet lists/detail) include viewer progress when the
 * request happens to be authenticated, per plan §5.3.
 */
export async function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): Promise<void> {
  const token = (req.cookies as Record<string, string | undefined>)[COOKIE_NAMES.ACCESS];
  if (token) {
    const payload = await verifyAccessToken(token);
    if (payload) {
      req.user = { id: payload.sub, email: payload.email, role: payload.role };
    }
  }
  next();
}

/** Require the ADMIN role on top of requireAuth. */
export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    sendFail(res, 401, { code: ERROR_CODES.UNAUTHENTICATED, message: "Authentication required" });
    return;
  }
  if (req.user.role !== USER_ROLE.ADMIN) {
    sendFail(res, 403, { code: ERROR_CODES.FORBIDDEN, message: "Admin access required" });
    return;
  }
  next();
}