"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthResponse } from "@dsarats/shared";
import { apiFetch, getErrorMessage } from "@/lib/api";
import { safeNextPath } from "@/lib/redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/toast";

interface FieldErrors {
  email?: string;
  username?: string;
  displayName?: string;
  password?: string;
  confirmPassword?: string;
}

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Send the new user straight to the sheet/problem they came from, when present.
  const nextPath = safeNextPath(searchParams.get("next"));

  const [form, setForm] = useState({
    email: "",
    username: "",
    displayName: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function setField<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      await apiFetch<AuthResponse>("/auth/register", {
        method: "POST",
        body: {
          email: form.email,
          username: form.username,
          displayName: form.displayName || undefined,
          password: form.password,
          confirmPassword: form.confirmPassword,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast("Account created. Welcome to DSARats!");
      router.push(nextPath);
    } catch (err) {
      const apiErr = err as { body?: { field?: string; message: string } };
      if (apiErr.body?.field) {
        setFieldErrors((prev) => ({ ...prev, [apiErr.body!.field as keyof FieldErrors]: apiErr.body!.message }));
      } else {
        setFormError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {formError && (
            <p role="alert" className="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
              {formError}
            </p>
          )}
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            error={fieldErrors.email}
            placeholder="you@example.com"
          />
          <Input
            label="Username"
            autoComplete="username"
            required
            value={form.username}
            onChange={(e) => setField("username", e.target.value)}
            error={fieldErrors.username}
            hint="3–20 characters: lowercase letters, numbers, underscores"
          />
          <Input
            label="Display name (optional)"
            autoComplete="name"
            value={form.displayName}
            onChange={(e) => setField("displayName", e.target.value)}
            error={fieldErrors.displayName}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={(e) => setField("password", e.target.value)}
            error={fieldErrors.password}
            hint="At least 8 characters"
          />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            required
            value={form.confirmPassword}
            onChange={(e) => setField("confirmPassword", e.target.value)}
            error={fieldErrors.confirmPassword}
          />
          <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
            Create account
          </Button>
        </form>
        <p className="text-center text-xs text-muted">
          Email verification and Google sign-in arrive in later phases.
        </p>
      </CardContent>
    </Card>
  );
}