"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, ExternalLink } from "lucide-react";
import type { WeeklyChallengeResponse } from "@dsarats/shared";
import { apiFetch } from "@/lib/api";
import { ProblemRow } from "@/components/problem-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";

export default function WeeklyChallengePage() {
  const weekly = useQuery({
    queryKey: ["weekly-challenge"],
    queryFn: () => apiFetch<WeeklyChallengeResponse>("/weekly-challenge"),
  });

  if (weekly.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (weekly.isError) {
    return (
      <ErrorState
        title="Couldn't load this week's challenge"
        message="The server didn't respond. Check your connection and try again."
        onRetry={() => void weekly.refetch()}
      />
    );
  }

  const challenge = weekly.data?.challenge ?? null;
  const solvedCount = weekly.data?.solvedCount ?? 0;
  const totalCount = weekly.data?.totalCount ?? 0;

  if (!challenge) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          Weekly Challenge
        </h1>
        <EmptyState
          as="h2"
          title="No challenge this week"
          description="A weekly set appears once the problem catalog is published."
        />
      </div>
    );
  }

  const pct = totalCount === 0 ? 0 : (solvedCount / totalCount) * 100;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          Weekly Challenge
        </h1>
        <p className="mt-1 text-sm text-muted">
          One shared set for every learner this week — so progress is comparable. It is picked
          deterministically and never re-rolls.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <CalendarRange className="size-4 text-accent" aria-hidden />
            {challenge.title}
          </CardTitle>
          <span className="text-sm tabular-nums text-secondary">
            {solvedCount}/{totalCount} solved
          </span>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ProgressBar value={pct} />
          {challenge.description ? (
            <p className="text-sm text-secondary">{challenge.description}</p>
          ) : null}
          <p className="text-xs text-muted">
            Week begins {weekly.data!.weekStart} · {challenge.weekKey}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>This week&apos;s problems</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul>
            {challenge.problems.map((problem, index) => (
              <ProblemRow
                key={problem.id}
                problem={problem}
                href={`/app/problems/${problem.id}`}
                index={index + 1}
              />
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/app/practice">
          <Button variant="secondary" size="sm">
            Browse the full catalog
            <ExternalLink className="size-4" aria-hidden />
          </Button>
        </Link>
        <span className="text-xs text-muted">
          Solving any of these here counts toward the set — progress is read from your problem
          statuses.
        </span>
      </div>
    </div>
  );
}
