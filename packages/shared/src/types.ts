import type { ProfileVisibility } from "./community-types";
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
  bio: string | null;
  avatarUrl: string | null;
  /** IANA timezone — day boundaries for streaks are computed in this zone. */
  timezone: string;
  theme: Theme;
  /** Weekly goal in problems per week, or null when unset. */
  learningGoal: number | null;
  onboardedAt: string | null;
  longestStreak: number;
  /** Phase 7: whether other learners may see this profile (private until opted in). */
  visibility: ProfileVisibility;
}

/** Shape returned by GET /api/v1/auth/me. */
export type MeResponse = { user: PublicUser };

/** Shape returned by POST /api/v1/auth/register and /login. */
export type AuthResponse = { user: PublicUser };