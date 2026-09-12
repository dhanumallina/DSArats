"use client";

import { useMe } from "@/hooks/use-me";

export function DashboardGreeting() {
  const { data } = useMe();
  const name = data?.user.profile?.displayName ?? data?.user.profile?.username ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
        {greeting}, {name}.
      </h1>
      <p className="mt-1 text-sm text-secondary">
        What should you learn today? DSARats keeps you on track.
      </p>
    </div>
  );
}