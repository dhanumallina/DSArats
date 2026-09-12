import { Prisma } from "@prisma/client";
import { ERROR_CODES } from "@dsarats/shared";
import type { LoginInput, RegisterInput, PublicUser } from "@dsarats/shared";
import { prisma } from "../db";
import { hashPassword, verifyPassword } from "../utils/password";
import {
  computeSessionExpiry,
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from "../utils/tokens";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: (typeof ERROR_CODES)[keyof typeof ERROR_CODES],
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

interface SessionCookies {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

function toPublicUser(user: {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  emailVerifiedAt: Date | null;
  createdAt: Date;
  profile: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    timezone: string;
    theme: "LIGHT" | "DARK" | "SYSTEM";
    learningGoal: number | null;
    onboardedAt: Date | null;
    longestStreak: number;
  } | null;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerifiedAt !== null,
    createdAt: user.createdAt.toISOString(),
    profile: user.profile
      ? {
          username: user.profile.username,
          displayName: user.profile.displayName,
          avatarUrl: user.profile.avatarUrl,
          timezone: user.profile.timezone,
          theme: user.profile.theme,
          learningGoal: user.profile.learningGoal,
          onboardedAt: user.profile.onboardedAt?.toISOString() ?? null,
          longestStreak: user.profile.longestStreak,
        }
      : null,
  };
}

const userWithProfile = {
  id: true,
  email: true,
  role: true,
  emailVerifiedAt: true,
  createdAt: true,
  profile: {
    select: {
      username: true,
      displayName: true,
      avatarUrl: true,
      timezone: true,
      theme: true,
      learningGoal: true,
      onboardedAt: true,
      longestStreak: true,
    },
  },
} as const;

async function createSession(userId: string, userAgent?: string | null, ip?: string): Promise<{ refreshToken: string; refreshExpiresAt: Date }> {
  const { token: refreshToken, hash } = generateRefreshToken();
  const refreshExpiresAt = computeSessionExpiry();

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hash,
      expiresAt: refreshExpiresAt,
      userAgent: userAgent ? userAgent.slice(0, 200) : null,
      ip,
    },
  });

  // Opportunistic cleanup of expired sessions (indexed on expiresAt, cheap, rare matches).
  void prisma.session
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => undefined);

  return { refreshToken, refreshExpiresAt };
}

export async function registerUser(input: RegisterInput, meta?: { userAgent?: string; ip?: string }) {
  const [existingUser, existingUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email } }),
    prisma.profile.findUnique({ where: { username: input.username } }),
  ]);
  if (existingUser) {
    throw new ApiError(409, ERROR_CODES.CONFLICT, "Email is already taken", "email");
  }
  if (existingUsername) {
    throw new ApiError(409, ERROR_CODES.CONFLICT, "Username is already taken", "username");
  }

  const passwordHash = await hashPassword(input.password);
  // Note: when the account doesn't exist, no bcrypt runs — a timing side channel.
  // Mitigated for now by authLimiter on /login; a dummy-compare can be added in the
  // Phase 10 security hardening pass.

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        profile: {
          create: {
            username: input.username,
            displayName: input.displayName,
          },
        },
      },
      select: userWithProfile,
    });
  } catch (err) {
    // Race between the check above and the insert — a unique constraint violation
    // means another request took the email/username first. Map it to a clean 409.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = Array.isArray(err.meta?.target) ? String(err.meta.target[0]) : "";
      const field = target === "username" ? "username" : "email";
      throw new ApiError(409, ERROR_CODES.CONFLICT, `${field} is already taken`, field);
    }
    throw err;
  }

  const session = await createSession(user.id, meta?.userAgent, meta?.ip);
  const accessToken = await signAccessToken({ sub: user.id, email: user.email, role: user.role });

  return { user: toPublicUser(user), accessToken, ...session };
}

export async function loginUser(input: LoginInput, meta?: { userAgent?: string; ip?: string }) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...userWithProfile, passwordHash: true, status: true },
  });

  if (!user || !user.passwordHash) {
    throw new ApiError(401, ERROR_CODES.INVALID_CREDENTIALS, "Invalid email or password");
  }

  // Brute-force protection for now = authLimiter (5 req/min/IP); per-account lockout
  // lands in the Phase 10 security hardening pass.
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    throw new ApiError(401, ERROR_CODES.INVALID_CREDENTIALS, "Invalid email or password");
  }

  if (user.status !== "ACTIVE") {
    throw new ApiError(403, ERROR_CODES.FORBIDDEN, "This account is disabled");
  }

  const session = await createSession(user.id, meta?.userAgent, meta?.ip);
  const accessToken = await signAccessToken({ sub: user.id, email: user.email, role: user.role });

  return { user: toPublicUser(user), accessToken, ...session };
}

export async function refreshSession(
  rawRefreshToken: string,
  meta?: { userAgent?: string; ip?: string },
): Promise<SessionCookies & { user: PublicUser }> {
  const hash = hashRefreshToken(rawRefreshToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash: hash },
    include: { user: { select: { ...userWithProfile, status: true } } },
  });

  if (!session || session.expiresAt < new Date()) {
    throw new ApiError(401, ERROR_CODES.UNAUTHENTICATED, "Session expired. Please log in again.");
  }

  if (session.user.status !== "ACTIVE") {
    throw new ApiError(403, ERROR_CODES.FORBIDDEN, "This account is disabled");
  }

  // Atomic consume: only one request may revoke this session. If it was already
  // consumed (or a stale copy is replayed), revoke the whole family — the token
  // was likely stolen (reuse detection, per the approved plan §3.3).
  const consumed = await prisma.session.updateMany({
    where: { id: session.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (consumed.count === 0) {
    await revokeAllUserSessions(session.userId);
    throw new ApiError(401, ERROR_CODES.UNAUTHENTICATED, "Session expired. Please log in again.");
  }

  const next = await createSession(session.userId, meta?.userAgent ?? session.userAgent, meta?.ip);
  const accessToken = await signAccessToken({
    sub: session.userId,
    email: session.user.email,
    role: session.user.role,
  });

  return { user: toPublicUser(session.user), accessToken, ...next };
}

export async function revokeSession(rawRefreshToken: string): Promise<void> {
  if (!rawRefreshToken) return;
  const hash = hashRefreshToken(rawRefreshToken);
  await prisma.session.updateMany({
    where: { tokenHash: hash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export { toPublicUser, userWithProfile };

// Note: per-account lockout (MAX_FAILED_LOGINS/LOCKOUT_MS) is deferred to the
// Phase 10 security hardening pass; rate limiting covers auth endpoints for now.