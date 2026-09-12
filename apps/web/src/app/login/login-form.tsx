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

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Restore the page the user was heading to before being sent to /login.
  const nextPath = safeNextPath(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      await apiFetch<AuthResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast("Welcome back!");
      router.push(nextPath);
    } catch (err) {
      if (err instanceof Error && "body" in err && (err as { body?: { field?: string } }).body?.field) {
        const apiErr = err as { body: { field: string; message: string } };
        setFieldErrors({ [apiErr.body.field]: apiErr.body.message });
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            placeholder="••••••••"
          />
          <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
            Log in
          </Button>
        </form>
        <p className="text-center text-xs text-muted">
          Forgot your password? Password reset arrives in Phase 3.
        </p>
      </CardContent>
    </Card>
  );
}