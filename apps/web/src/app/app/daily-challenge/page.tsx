"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ExternalLink, Flame } from "lucide-react";
import type {
  DailyChallengeCompleteResponse,
  DailyChallengeHistoryResponse,
  DailyChallengeResponse,
  DailyChallengeStatus,
  StreakResponse,
} from "@dsarats/shared";
import { apiFetch, getErrorMessage } from "@/lib/api";
import { useToast } from "@/components/toast";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";

const COMPLETION_LABEL: Record<DailyChallengeStatus, string> = {
  SOLVED: "Solved",
  ATTEMPTED: "Attempted",
  SKIPPED: "Skipped",
};

export default function DailyChallengePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const today = useQuery({
    queryKey: ["daily-challenge"],
    queryFn: () => apiFetch<DailyChallengeResponse>("/daily-challenge"),
  });
  const history = useQuery({
    queryKey: ["daily-challenge-history"],
    queryFn: () => apiFetch<DailyChallengeHistoryResponse>("/daily-challenge/history"),
  });
  const streak = useQuery({
    queryKey: ["streak"],
    queryFn: () => apiFetch<StreakResponse>("/streak"),
  });

  const complete = useMutation({
    mutationFn: (status: DailyChallengeStatus) =>
      apiFetch<DailyChallengeCompleteResponse>("/daily-challenge/complete", {
        method: "POST",
        body: { status },
      }),
    onSuccess: (res) => {
      // The challenge feeds the streak and the dashboard, so refresh all of them.
      for (const key of ["daily-challenge", "daily-challenge-history", "dashboard", "progress", "streak", "heatmap"]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
      toast(
        res.streak.activeToday
          ? `Marked ${COMPLETION_LABEL[res.completion.status].toLowerCase()} — ${res.streak.current}-day streak.`
          : `Marked ${COMPLETION_LABEL[res.completion.status].toLowerCase()}.`,
        res.completion.status === "SKIPPED" ? "info" : "success",
      );
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  if (today.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (today.isError) {
    return (
      <ErrorState
        title="Couldn't load today's challenge"
        message="The server didn't respond. Check your connection and try again."
        onRetry={() => void today.refetch()}
      />
    );
  }

  const challenge = today.data?.challenge ?? null;
  const completion = today.data?.completion ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
            Daily Challenge
          </h1>
          <p className="mt-1 text-sm text-muted">
            One problem a day, chosen from your least-covered topics.
          </p>
        </div>
        {streak.data ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm text-secondary">
            <Flame className="size-4 text-accent" aria-hidden />
            {streak.data.current}-day streak
            {streak.data.activeToday ? " · active today" : ""}
          </span>
        ) : null}
      </div>

      {!challenge ? (
        <EmptyState
          as="h2"
          title="No challenge available yet"
          description="A daily challenge appears once the problem catalog is published."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4 text-accent" aria-hidden />
              {challenge.date}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/app/problems/${challenge.problem.id}`}
                className="font-display text-xl font-semibold text-foreground hover:text-link"
              >
                {challenge.problem.title}
              </Link>
              <DifficultyBadge difficulty={challenge.problem.difficulty} />
              <span className="text-sm text-secondary">{challenge.problem.topic.name}</span>
              {completion ? (
                <Badge tone={completion.status === "SOLVED" ? "success" : "accent"}>
                  {COMPLETION_LABEL[completion.status]}
                </Badge>
              ) : null}
            </div>

            {challenge.reason ? <p className="text-sm text-muted">{challenge.reason}</p> : null}

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={challenge.problem.platformProblemUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button>
                  Open problem
                  <ExternalLink className="size-4" aria-hidden />
                </Button>
              </a>
              <Link href={`/app/problems/${challenge.problem.id}`}>
                <Button variant="secondary">Problem details</Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <span className="text-sm text-secondary">How did it go?</span>
              <Button
                size="sm"
                variant={completion?.status === "SOLVED" ? "primary" : "secondary"}
                loading={complete.isPending && complete.variables === "SOLVED"}
                onClick={() => complete.mutate("SOLVED")}
              >
                Solved it
              </Button>
              <Button
                size="sm"
                variant={completion?.status === "ATTEMPTED" ? "primary" : "secondary"}
                loading={complete.isPending && complete.variables === "ATTEMPTED"}
                onClick={() => complete.mutate("ATTEMPTED")}
              >
                Attempted
              </Button>
              <Button
                size="sm"
                variant={completion?.status === "SKIPPED" ? "primary" : "ghost"}
                loading={complete.isPending && complete.variables === "SKIPPED"}
                onClick={() => complete.mutate("SKIPPED")}
              >
                Skip today
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {history.isLoading ? (
            <div className="p-5">
              <Skeleton lines={3} />
            </div>
          ) : history.isError ? (
            <p className="px-5 py-6 text-sm text-muted">
              We couldn&apos;t load your challenge history right now.
            </p>
          ) : (history.data?.items ?? []).length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">
              Nothing here yet — complete today&apos;s challenge to start your history.
            </p>
          ) : (
            <ul>
              {history.data!.items.map((item) => (
                <li
                  key={item.challenge.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/app/problems/${item.challenge.problem.id}`}
                      className="truncate text-sm font-medium text-foreground hover:text-link"
                    >
                      {item.challenge.problem.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {item.challenge.date} · {item.challenge.problem.topic.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <DifficultyBadge difficulty={item.challenge.problem.difficulty} />
                    <Badge tone={item.completion.status === "SOLVED" ? "success" : "neutral"}>
                      {COMPLETION_LABEL[item.completion.status]}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
