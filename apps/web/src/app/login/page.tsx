import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Login",
  description: "Log in to DSARats to continue your DSA journey.",
};

export default function LoginPage() {
  return (
    <div id="main-content" className="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-display text-2xl font-bold tracking-tight">
            DSA<span className="text-accent">Rats</span>
          </Link>
          <p className="mt-2 text-sm text-muted">Master DSA. Build Consistency. Crack Interviews.</p>
        </div>

        {/* Suspense boundary: the form reads ?next= via useSearchParams. */}
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-sm text-muted">
          New to DSARats?{" "}
          <Link href="/signup" className="font-medium text-link hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}