import type { ApiErrorBody, ApiResponse } from "@dsarats/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: ApiErrorBody,
  ) {
    super(body.message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

/** Guards concurrent refresh attempts — only one /auth/refresh in flight at a time. */
let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/** Fetch helper: sends credentials (httpOnly cookies), unwraps the response envelope. */
export async function apiFetch<T>(path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const { method = "GET", body, headers } = options;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Silent session refresh: if the access token expired, rotate it via the refresh
  // cookie and retry the original request exactly once (guarded against loops).
  // Never refreshes for /auth/refresh itself.
  if (res.status === 401 && !retried && path !== "/auth/refresh") {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiFetch<T>(path, options, true);
    }
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!json || json.success !== true) {
    const errorBody: ApiErrorBody =
      json && "error" in json
        ? json.error
        : { code: "INTERNAL_ERROR", message: "Unexpected response from server" };
    throw new ApiError(res.status, errorBody);
  }

  return json.data;
}

/** True when the error is a genuine 401 (logged out / expired) rather than a network blip. */
export function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.body.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}