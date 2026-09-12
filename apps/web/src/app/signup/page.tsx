import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your DSARats account and start your DSA journey.",
};

export default function SignupPage() {
  return (
    <div id="main-content" className="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-display text-2xl font-bold tracking-tight">
            DSA<span className="text-accent">Rats</span>
          </Link>
          <p className="mt-2 text-sm text-muted">Start your structured DSA journey.</p>
        </div>

        {/* Suspense boundary: the form reads ?next= via useSearchParams. */}
        <Suspense fallback={null}>
          <SignupForm />
        </Suspense>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-link hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}