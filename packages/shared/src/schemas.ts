import { z } from "zod";
import { PROFILE_VISIBILITY } from "./community-types";
import { LIMITS, THEME } from "./constants";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(LIMITS.EMAIL_MAX, `Email must be at most ${LIMITS.EMAIL_MAX} characters`);

const passwordSchema = z
  .string()
  .min(LIMITS.PASSWORD_MIN, `Password must be at least ${LIMITS.PASSWORD_MIN} characters`)
  .max(LIMITS.PASSWORD_MAX, `Password must be at most ${LIMITS.PASSWORD_MAX} characters`);

const usernameSchema = z
  .string()
  .trim()
  .min(LIMITS.USERNAME_MIN, `Username must be at least ${LIMITS.USERNAME_MIN} characters`)
  .max(LIMITS.USERNAME_MAX, `Username must be at most ${LIMITS.USERNAME_MAX} characters`)
  .regex(/^[a-z0-9_]+$/, "Username may only contain lowercase letters, numbers, and underscores");

/** POST /api/v1/auth/register */
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
    username: usernameSchema,
    displayName: z.string().trim().max(LIMITS.DISPLAY_NAME_MAX).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

/** POST /api/v1/auth/login */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** POST /api/v1/auth/forgot-password */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** POST /api/v1/auth/reset-password */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * A timezone the runtime can actually resolve.
 *
 * Validated eagerly: an unknown zone is silently ignored by the streak code (it falls
 * back to UTC), so accepting one would let a user believe their days roll over locally
 * when they do not.
 */
const timezoneSchema = z
  .string()
  .trim()
  .min(1, "Timezone is required")
  .max(64)
  .refine(
    (timezone) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: timezone });
        return true;
      } catch {
        return false;
      }
    },
    "Enter a valid IANA timezone, for example Asia/Kolkata",
  );

/** PATCH /api/v1/users/me/profile — partial update; null clears a field. */
export const updateProfileSchema = z
  .object({
    username: usernameSchema.optional(),
    displayName: z.string().trim().max(LIMITS.DISPLAY_NAME_MAX).nullable().optional(),
    bio: z.string().trim().max(LIMITS.BIO_MAX).nullable().optional(),
    timezone: timezoneSchema.optional(),
    theme: z.enum([THEME.LIGHT, THEME.DARK, THEME.SYSTEM]).optional(),
    learningGoal: z
      .number()
      .int()
      .min(LIMITS.WEEKLY_GOAL_MIN)
      .max(LIMITS.WEEKLY_GOAL_MAX)
      .nullable()
      .optional(),
    /** Phase 7: opt in (or back out of) publishing the profile. */
    visibility: z.enum([PROFILE_VISIBILITY.PRIVATE, PROFILE_VISIBILITY.PUBLIC]).optional(),
  })
  .strict();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** PATCH /api/v1/auth/change-password (future) */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;