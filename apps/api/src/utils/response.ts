import type { Response } from "express";
import type { ApiResponse, ApiErrorBody } from "@dsarats/shared";

export function sendOk<T>(res: Response, data: T, status = 200): void {
  const body: ApiResponse<T> = { success: true, data };
  res.status(status).json(body);
}

export function sendFail(res: Response, status: number, error: ApiErrorBody): void {
  const body: ApiResponse<never> = { success: false, error };
  res.status(status).json(body);
}