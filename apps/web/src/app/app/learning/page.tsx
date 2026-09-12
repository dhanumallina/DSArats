"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import type { TopicsResponse } from "@dsarats/shared";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";

export default function LearningPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["topics"],
    queryFn: () => apiFetch<TopicsResponse>("/topics"),
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load your learning path"
        message="The server didn't respond. Check your connection and try again."
        onRetry={() => void refetch()}
      />
    );
  }

  // Topics arrive ordered by their place in the curriculum.
  const topics = (data?.topics ?? []).filter((topic) => topic._count.problems > 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">My Learning</h1>
        <p className="mt-1 text-sm text-muted">
          The curriculum in order — work through each topic, then practise it from the problem list.
        </p>
      </div>

      {topics.length === 0 ? (
        <EmptyState
          as="h2"
          title="No topics to learn yet"
          description="Topics appear here as soon as published problems are assigned to them."
        />
      ) : (
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic, index) => (
            <li key={topic.id}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex size-8 items-center justify-center rounded-full border border-border font-display text-sm font-semibold text-muted">
                      {index + 1}
                    </span>
                    <span className="text-xs text-muted">
                      {topic._count.problems} problem{topic._count.problems === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div>
                    <h2 className="font-display text-base font-semibold">{topic.name}</h2>
                    {topic.description ? (
                      <p className="mt-1 text-sm text-muted">{topic.description}</p>
                    ) : null}
                  </div>

                  <div className="mt-auto pt-2">
                    <Link href={`/app/practice?topic=${topic.slug}`}>
                      <Button variant="secondary" size="sm">
                        Practise
                        <ArrowRight className="size-4" aria-hidden />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
