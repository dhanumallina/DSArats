"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Layers } from "lucide-react";
import type { SheetsListResponse } from "@dsarats/shared";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export function ContinueLearning() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["sheets"],
    queryFn: () => apiFetch<SheetsListResponse>("/sheets"),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-muted">
        We couldn&apos;t load your sheets right now. Try again in a moment.
      </p>
    );
  }

  const active = (data?.sheets ?? []).filter((sheet) => sheet.viewer?.started);

  if (active.length === 0) {
    return (
      <EmptyState
        as="h3"
        title="No active sheet yet"
        description="Start a DSA sheet to pick up where you left off — your progress resumes automatically."
        action={
          <Link href="/app/sheets">
            <Button size="sm">Browse sheets</Button>
          </Link>
        }
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {active.map((sheet) => (
        <li
          key={sheet.slug}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent-hover dark:text-accent">
              <Layers className="size-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{sheet.name}</p>
              <p className="text-xs text-muted">
                {sheet.problemCount} problem{sheet.problemCount === 1 ? "" : "s"} ·{" "}
                {sheet.topics.length} topics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {sheet.viewer?.status === "COMPLETED" ? (
              <Badge tone="success">Completed</Badge>
            ) : (
              <Badge tone="accent">In progress</Badge>
            )}
            <Link href={`/app/sheets/${sheet.slug}`}>
              <Button size="sm" variant="secondary">
                {sheet.viewer?.status === "COMPLETED" ? "Review" : "Continue"}
              </Button>
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
