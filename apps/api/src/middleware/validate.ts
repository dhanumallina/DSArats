import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { ZodError } from "zod";
import { ERROR_CODES } from "@dsarats/shared";
import { sendFail } from "../utils/response";

interface ValidationTargets {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/** Assign parsed values onto the request. `req.query` is a getter-only property on
 *  Express 5's request prototype, so a plain assignment throws; define an own
 *  property instead so downstream handlers read the parsed (coerced, defaulted) values. */
function assign(req: Request, key: "body" | "query" | "params", value: unknown): void {
  Object.defineProperty(req, key, { value, writable: true, enumerable: true, configurable: true });
}

/** Validate request body/query/params against zod schemas before the handler runs. */
export function validate(schemas: ValidationTargets) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) assign(req, "body", schemas.body.parse(req.body));
      if (schemas.query) assign(req, "query", schemas.query.parse(req.query));
      if (schemas.params) assign(req, "params", schemas.params.parse(req.params));
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const first = err.issues[0];
        sendFail(res, 400, {
          code: ERROR_CODES.VALIDATION_FAILED,
          message: first?.message ?? "Invalid input",
          field: first?.path.join("."),
        });
        return;
      }
      next(err);
    }
  };
}