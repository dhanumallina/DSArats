"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import type { SheetDetailResponse, SheetProgressDto } from "@dsarats/shared";
import { ApiError, apiFetch, getErrorMessage } from "@/lib/api";
import { useToast } from "@/components/toast";
import { ProblemRow } from "@/components/problem-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";

const SHEET_DIFFICULTY_LABEL: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export default function AppSheetDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["sheet", slug],
    queryFn: () => apiFetch<SheetDetailResponse>(`/sheets/${slug}`),
    retry: false,
  });

  const start = useMutation({
    mutationFn: () => apiFetch<{ progress: SheetProgressDto }>(`/sheets/${slug}/start`, { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sheet", slug] });
      void queryClient.invalidateQueries({ queryKey: ["sheets"] });
      toast("Sheet started — pick your first problem.", "success");
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const completeTopic = useMutation({
    mutationFn: (topicId: string) =>
      apiFetch<{ progress: SheetProgressDto }>(`/sheets/${slug}/complete-topic`, {
        method: "POST",
        body: { topicId },
      }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["sheet", slug] });
      void queryClient.invalidateQueries({ queryKey: ["sheets"] });
      toast(
        res.progress.status === "COMPLETED" ? "Sheet completed. Well done!" : "Topic marked complete.",
        "success",
      );
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton lines={3} className="max-w-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return notFound ? (
      <EmptyState
        as="h1"
        title="Sheet not found"
        description="This sheet may have been unpublished or removed."
        action={
          <Link href="/app/sheets">
            <Button variant="secondary" size="sm">
              Back to sheets
            </Button>
          </Link>
        }
      />
    ) : (
      <ErrorState
        title="Couldn't load this sheet"
        message="The server didn't respond. Check your connection and try again."
        onRetry={() => void refetch()}
      />
    );
  }

  const sheet = data?.sheet;
  const viewer = data?.viewer ?? null;
  if (!sheet) return null;

  const status = viewer?.status ?? null;
  const started = viewer?.started ?? false;
  const currentTopicId = viewer?.currentTopicId ?? null;

  const currentIndex = currentTopicId
    ? sheet.topics.findIndex((topic) => topic.id === currentTopicId)
    : -1;
  const completedTopics = status === "COMPLETED" ? sheet.topics.length : Math.max(currentIndex, 0);
  const progressPct = sheet.topics.length === 0 ? 0 : (completedTopics / sheet.topics.length) * 100;
  const isDone = status === "COMPLETED";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/app/sheets"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-secondary hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All sheets
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{sheet.name}</h1>
          <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-secondary">
            {SHEET_DIFFICULTY_LABEL[sheet.difficulty] ?? sheet.difficulty}
          </span>
          {isDone ? <Badge tone="success">Completed</Badge> : null}
          {!isDone && started ? <Badge tone="accent">In progress</Badge> : null}
        </div>

        <p className="mt-2 max-w-2xl text-sm text-secondary">{sheet.description}</p>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-secondary">
          <span className="font-medium text-foreground">
            {sheet.problemCount} problem{sheet.problemCount === 1 ? "" : "s"}
          </span>
          {sheet.estimatedHours ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden />~{sheet.estimatedHours} hours
            </span>
          ) : null}
          <span>Easy {sheet.difficultyDistribution.EASY}</span>
          <span>Medium {sheet.difficultyDistribution.MEDIUM}</span>
          <span>Hard {sheet.difficultyDistribution.HARD}</span>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <ProgressBar value={progressPct} showLabel />
            <p className="mt-2 text-xs text-muted">
              {isDone
                ? "You have worked through every topic in this sheet."
                : started
                  ? `${completedTopics} of ${sheet.topics.length} topics complete`
                  : "Start the sheet to track topics as you go."}
            </p>
          </div>
          <div className="shrink-0">
            {!started ? (
              <Button loading={start.isPending} onClick={() => start.mutate()}>
                Start sheet
              </Button>
            ) : !isDone ? (
              <span className="text-sm text-muted">Finish a topic to advance</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {sheet.topics.length === 0 ? (
        <EmptyState
          as="h2"
          title="No problems in this sheet yet"
          description="Problems will appear here once they are added to the sheet."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {sheet.topics.map((topic, topicIndex) => {
            const isCurrent = started && !isDone && topic.id === currentTopicId;
            const isTopicDone = isDone || (started && currentIndex !== -1 && topicIndex < currentIndex);

            return (
              <section key={topic.id} aria-labelledby={`topic-${topic.id}`}>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <h2
                    id={`topic-${topic.id}`}
                    className="flex items-center gap-2 font-display text-lg font-semibold"
                  >
                    <span className="text-muted">{topicIndex + 1}.</span>
                    {topic.name}
                    {isTopicDone ? (
                      <CheckCircle2 className="size-4 text-success" aria-label="Completed" />
                    ) : null}
                    {isCurrent ? <Badge tone="accent">Current</Badge> : null}
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted">
                      {topic.problemCount} problem{topic.problemCount === 1 ? "" : "s"}
                    </span>
                    {isCurrent ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={completeTopic.isPending}
                        onClick={() => completeTopic.mutate(topic.id)}
                      >
                        Mark topic complete
                      </Button>
                    ) : null}
                  </div>
                </div>

                <Card>
                  <CardContent className="p-0">
                    {topic.problems.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-muted">
                        No problems assigned to this topic yet.
                      </p>
                    ) : (
                      <ul>
                        {topic.problems.map((problem, i) => (
                          <ProblemRow
                            key={problem.id}
                            problem={problem}
                            href={`/app/problems/${problem.id}`}
                            index={
                              sheet.topics
                                .slice(0, topicIndex)
                                .reduce((sum, t) => sum + t.problems.length, 0) +
                              i +
                              1
                            }
                          />
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </section>
            );
          })}
        </div>
      )}

      {!started ? (
        <p className="text-sm text-muted">
          Tip: start the sheet first so your topic progress is tracked and you can resume on the
          dashboard.
        </p>
      ) : null}
    </div>
  );
}
