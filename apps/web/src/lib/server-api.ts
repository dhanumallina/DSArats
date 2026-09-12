import type { ApiResponse } from "@dsarats/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/** Discriminated result so pages can tell "not found" apart from "API unavailable". */
export type ServerResult<T> = { ok: true; data: T } | { ok: false; status: number | null };

/**
 * Server-side GET for public endpoints, used by server components.
 *
 * `cache: "no-store"` keeps rendering correct and avoids fetching the API at build
 * time (the API may not be running during `next build`), so failures only affect a
 * single request and can be rendered as an error state.
 */
export async function serverGet<T>(path: string): Promise<ServerResult<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
    if (!res.ok || !json || json.success !== true) {
      return { ok: false, status: res.status };
    }
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, status: null };
  }
}
