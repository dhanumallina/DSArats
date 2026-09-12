import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema, updateProfileSchema } from "@dsarats/shared";

describe("registerSchema", () => {
  const valid = {
    email: "student@example.com",
    password: "hunter2hunter2",
    confirmPassword: "hunter2hunter2",
    username: "dsa_student",
  };

  it("accepts a valid registration", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid email", () => {
    const res = registerSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(res.success).toBe(false);
  });

  it("rejects short password", () => {
    const res = registerSchema.safeParse({ ...valid, password: "short", confirmPassword: "short" });
    expect(res.success).toBe(false);
  });

  it("rejects mismatched confirmation", () => {
    const res = registerSchema.safeParse({ ...valid, confirmPassword: "different" });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.includes("confirmPassword"))).toBe(true);
    }
  });

  it("rejects invalid username characters", () => {
    const res = registerSchema.safeParse({ ...valid, username: "Bad Name!" });
    expect(res.success).toBe(false);
  });

  it("rejects uppercase in username", () => {
    const res = registerSchema.safeParse({ ...valid, username: "DSAStudent" });
    expect(res.success).toBe(false);
  });

  it("normalizes email to lowercase", () => {
    const res = registerSchema.safeParse({ ...valid, email: "Student@Example.COM" });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.email).toBe("student@example.com");
  });
});

describe("loginSchema", () => {
  it("accepts email + password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });

  it("rejects missing password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com" }).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  it("accepts an empty update (nothing changed)", () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true);
  });

  it("accepts valid fields", () => {
    const res = updateProfileSchema.safeParse({
      displayName: "DSA Student",
      theme: "DARK",
      learningGoal: 5,
    });
    expect(res.success).toBe(true);
  });

  it("rejects unknown keys", () => {
    expect(updateProfileSchema.safeParse({ evil: true }).success).toBe(false);
  });

  it("rejects invalid theme", () => {
    expect(updateProfileSchema.safeParse({ theme: "NEON" }).success).toBe(false);
  });
});