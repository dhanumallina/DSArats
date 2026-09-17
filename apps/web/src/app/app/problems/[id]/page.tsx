"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, ExternalLink } from "lucide-react";
import type { ProblemDetailResponse } from "@dsarats/shared";
import { ApiError, apiFetch } from "@/lib/api";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Notebook } from "./notebook";
import { ProgressControls } from "./progress-controls";

const PLATFORM_LABEL: Record<string, string> = {
  LEETCODE: "LeetCode",
  GEEKSFORGEEKS: "GeeksforGeeks",
  CODEFORCES: "Codeforces",
  OTHER: "Other",
};

export default function ProblemDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["problem", id],
    queryFn: () => apiFetch<ProblemDetailResponse>(`/problems/${id}`),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton lines={3} className="max-w-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return notFound ? (
      <EmptyState
        as="h1"
        title="Problem not found"
        description="This problem may have been unpublished or removed."
        action={
          <Link href="/app/practice">
            <Button variant="secondary" size="sm">
              Back to practice
            </Button>
          </Link>
        }
      />
    ) : (
      <ErrorState
        title="Couldn't load this problem"
        message="The server didn't respond. Check your connection and try again."
        onRetry={() => void refetch()}
      />
    );
  }

  const problem = data?.problem;
  if (!problem) return null;

  const related = data?.related ?? [];
  const viewer = data?.viewer ?? null;
  const revision = data?.revision ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/app/practice"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-secondary hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Practice
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
            {problem.title}
          </h1>
          <DifficultyBadge difficulty={problem.difficulty} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-secondary">
          <span>{problem.topic.name}</span>
          {problem.pattern ? <span>Pattern: {problem.pattern}</span> : null}
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden />
            {problem.estimatedMinutes ? `~${problem.estimatedMinutes} min` : "—"}
          </span>
          <span>{PLATFORM_LABEL[problem.platform] ?? problem.platform}</span>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a href={problem.platformProblemUrl} target="_blank" rel="noopener noreferrer">
            <Button>
              Open problem
              <ExternalLink className="size-4" aria-hidden />
            </Button>
          </a>
          {problem.solutionUrl ? (
            <a href={problem.solutionUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">
                Official solution
                <ExternalLink className="size-4" aria-hidden />
              </Button>
            </a>
          ) : null}
          <Link href={`/app/practice?topic=${problem.topic.slug}`}>
            <Button variant="ghost">More {problem.topic.name}</Button>
          </Link>
        </div>
      </div>

      {problem.tags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {problem.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Complexity hints</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {problem.timeComplexityHint || problem.spaceComplexityHint ? (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-muted">Time</dt>
                <dd className="mt-1 font-mono text-sm text-foreground">
                  {problem.timeComplexityHint ?? "Aim to reason this out yourself"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-muted">Space</dt>
                <dd className="mt-1 font-mono text-sm text-foreground">
                  {problem.spaceComplexityHint ?? "Aim to reason this out yourself"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted">
              No complexity hints for this problem — work them out, then compare with your notes.
            </p>
          )}
          <p className="text-xs text-muted">
            Hints describe a target solution. They are not the only valid approach.
          </p>
        </CardContent>
      </Card>

      <ProgressControls problemId={problem.id} viewer={viewer} revision={revision} />

      <Notebook problemId={problem.id} />

      {related.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Related problems</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul>
              {related.map((item) => (
                <li key={item.id} className="border-b border-border last:border-b-0">
                  <Link
                    href={`/app/problems/${item.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors duration-150 hover:bg-surface-secondary"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {item.title}
                      </span>
                      <span className="block text-xs text-muted">{item.topic.name}</span>
                    </span>
                    <DifficultyBadge difficulty={item.difficulty} />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
