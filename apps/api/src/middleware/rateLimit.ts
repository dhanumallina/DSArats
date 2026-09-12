import { rateLimit } from "express-rate-limit";
import { ERROR_CODES } from "@dsarats/shared";
import { isTest } from "../config";

const createLimiter = (windowMs: number, limit: number) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isTest,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: ERROR_CODES.RATE_LIMITED,
          message: "Too many requests. Please slow down and try again.",
        },
      });
    },
  });

/** Auth endpoints: 5 req/min/IP (per plan §5.13). */
export const authLimiter = createLimiter(60_000, 5);

/** General API: 100 req/min/IP. */
export const generalLimiter = createLimiter(60_000, 100);