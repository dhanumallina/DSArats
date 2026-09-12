"use client";

import { useQuery } from "@tanstack/react-query";
import type { MeResponse } from "@dsarats/shared";
import { apiFetch, isUnauthorized } from "@/lib/api";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<MeResponse>("/auth/me"),
    retry: false,
    staleTime: 60_000,
  });
}

/** True only when the session is genuinely missing/expired (401), not a network blip. */
export function isLoggedOut(error: unknown): boolean {
  return isUnauthorized(error);
}