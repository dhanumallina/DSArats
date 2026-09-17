"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { REVISION_INTERVALS_DAYS } from "@dsarats/shared";
import type {
  RevisionCompleteResponse,
  RevisionDifficulty,
  RevisionHistoryResponse,
  RevisionItemDto,
  RevisionQueueResponse,
} from "@dsarats/shared";
import { apiFetch, getErrorMessage } from "@/lib/api";
import { useToast } from "@/components/toast";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const RATINGS: Array<{ value: RevisionDifficulty; label: string }> = [
  { value: "EASIER", label: "Easier than last time" },
  { value: "SAME", label: "About the same" },
  { value: "HARDER", label: "Harder than last time" },
];

function RevisionRow({
  item,
  onComplete,
  pending,
}: {
  item: RevisionItemDto;
  onComplete: (problemId: string, rating: RevisionDifficulty) => void;
  pending: boolean;
}) {
  const [rating, setRating] = useState<RevisionDifficulty>("SAME");

  return (
    <li className="flex flex-col gap-3 border-b border-border px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/app/problems/${item.problemId}`}
            className="truncate text-sm font-medium text-foreground hover:text-link"
          >
            {item.problem.title}
          </Link>
          <DifficultyBadge difficulty={item.problem.difficulty} />
          <Badge tone={item.daysOverdue > 0 ? "error" : "neutral"}>
            {item.daysOverdue > 0 ? `${item.daysOverdue}d overdue` : "due today"}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted">
          {item.problem.topic.name} · stage {item.stage + 1} of {REVISION_INTERVALS_DAYS.length} ·
          reviewed {item.timesReviewed} time{item.timesReviewed === 1 ? "" : "s"} · due{" "}
          {item.dueAt.slice(0, 10)}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Select
          label="How did it feel?"
          hideLabel
          value={rating}
          onChange={(event) => setRating(event.target.value as RevisionDifficulty)}
          className="w-44"
        >
          {RATINGS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Button
          size="sm"
          loading={pending}
          onClick={() => onComplete(item.problemId, rating)}
        >
          <CheckCircle2 className="size-4" aria-hidden />
          Mark revised
        </Button>
      </div>
    </li>
  );
}

export default function RevisionPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAll, setShowAll] = useState(false);

  const dueParam = showAll ? "false" : "true";
  const queue = useQuery({
    queryKey: ["revision", dueParam],
    queryFn: () => apiFetch<RevisionQueueResponse>(`/revision?due=${dueParam}`),
  });

  // A short trail of completed reviews — the honest record of the work put in.
  const history = useQuery({
    queryKey: ["revision-history"],
    queryFn: () => apiFetch<RevisionHistoryResponse>("/revision/history?limit=5"),
  });

  const complete = useMutation({
    mutationFn: ({ problemId, rating }: { problemId: string; rating: RevisionDifficulty }) =>
      apiFetch<RevisionCompleteResponse>(`/revision/${problemId}/complete`, {
        method: "POST",
        body: { difficultyAfterRevision: rating },
      }),
    onSuccess: (res) => {
      for (const key of [
        "revision",
        "revision-history",
        "dashboard",
        "progress",
        "streak",
        "heatmap",
      ]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
      const nextDue = res.item.dueAt.slice(0, 10);
      toast(`Revised — next review on ${nextDue}.`, "success");
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  if (queue.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (queue.isError) {
    return (
      <ErrorState
        title="Couldn't load your revision queue"
        message="The server didn't respond. Check your connection and try again."
        onRetry={() => void queue.refetch()}
      />
    );
  }

  const items = queue.data?.items ?? [];
  const dueCount = queue.data?.dueCount ?? 0;
  const scheduledCount = queue.data?.scheduledCount ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Revision</h1>
          <p className="mt-1 text-sm text-muted">
            Spaced repetition at 1 → 3 → 7 → 14 → 30 days. Reviewing on time is what makes it
            stick.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm text-secondary">
          <RotateCcw className="size-4 text-accent" aria-hidden />
          {dueCount} due · {scheduledCount} scheduled
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={showAll ? "secondary" : "primary"}
          onClick={() => setShowAll(false)}
        >
          Due today
        </Button>
        <Button
          size="sm"
          variant={showAll ? "primary" : "secondary"}
          onClick={() => setShowAll(true)}
        >
          All scheduled
        </Button>
      </div>

      {items.length === 0 ? (
        showAll ? (
          <EmptyState
            as="h2"
            title="Nothing scheduled yet"
            description="Solve a problem and DSARats will schedule it for revision automatically."
            action={
              <Link href="/app/practice">
                <Button size="sm">Browse problems</Button>
              </Link>
            }
          />
        ) : (
          <EmptyState
            as="h2"
            title="You're all caught up"
            description={
              scheduledCount > 0
                ? "Nothing is due today. Switch to “All scheduled” to see what's coming up."
                : "Solve a problem and DSARats will schedule it for revision automatically."
            }
          />
        )
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul>
              {items.map((item) => (
                <RevisionRow
                  key={item.problemId}
                  item={item}
                  pending={complete.isPending && complete.variables?.problemId === item.problemId}
                  onComplete={(problemId, rating) => complete.mutate({ problemId, rating })}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {(history.data?.items.length ?? 0) > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent revisions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul>
              {history.data!.items.map((item) => (
                <li
                  key={`${item.problemId}-${item.lastReviewedAt}`}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/app/problems/${item.problemId}`}
                      className="truncate text-sm font-medium text-foreground hover:text-link"
                    >
                      {item.problem.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {item.problem.topic.name} · reviewed {item.timesReviewed} time
                      {item.timesReviewed === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="text-xs text-muted">{item.lastReviewedAt.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
