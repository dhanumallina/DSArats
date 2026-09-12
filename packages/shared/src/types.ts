import type { ApiErrorBody } from "./errors";
import type { Theme, UserRole } from "./constants";

/** Consistent API response envelope: `{ success: true, data }` or `{ success: false, error }`. */
export type ApiResponse<T> = { success: true; data: T } | { success: false; error: ApiErrorBody };

/** Public shape of the auth response. */
export interface PublicUser {
  id: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  profile: PublicProfile | null;
  createdAt: string;
}

export interface PublicProfile {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  timezone: string;
  theme: Theme;
  learningGoal: number | null;
  onboardedAt: string | null;
  longestStreak: number;
}

/** Shape returned by GET /api/v1/auth/me. */
export type MeResponse = { user: PublicUser };

/** Shape returned by POST /api/v1/auth/register and /login. */
export type AuthResponse = { user: PublicUser };