import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ERROR_CODES } from "@dsarats/shared";
import { isTest } from "../config";
import { ApiError } from "../services/auth.service";
import { sendFail } from "../utils/response";

/** 404 for unknown API routes. */
export function notFoundHandler(_req: Request, res: Response): void {
  sendFail(res, 404, { code: ERROR_CODES.NOT_FOUND, message: "Route not found" });
}

/** Central error handler — maps ApiError to its status/code, everything else to 500. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    sendFail(res, err.status, { code: err.code, message: err.message, field: err.field });
    return;
  }

  // Map Prisma constraint violations to the documented error codes (plan §5.13) so
  // routes that don't wrap every write still fail with a meaningful status.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = Array.isArray(err.meta?.target) ? String(err.meta.target[0]) : undefined;
      sendFail(res, 409, {
        code: ERROR_CODES.CONFLICT,
        message: target ? `${target} is already taken` : "This record already exists",
        field: target,
      });
      return;
    }
    if (err.code === "P2025") {
      sendFail(res, 404, { code: ERROR_CODES.NOT_FOUND, message: "Resource not found" });
      return;
    }
  }

  const status = 500;
  const message = "Something went wrong. Please try again.";

  if (!isTest) {
    // eslint-disable-next-line no-console
    console.error("[api] unhandled error:", err);
  }

  sendFail(res, status, { code: ERROR_CODES.INTERNAL_ERROR, message });
}