"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import type { LeaderboardMetric, LeaderboardsResponse, LeaderboardEntryDto } from "@dsarats/shared";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";

const METRICS: Array<{ value: LeaderboardMetric; label: string; unit: string }> = [
  { value: "xp", label: "XP", unit: "XP" },
  { value: "solved", label: "Solved", unit: "solved" },
  { value: "streak", label: "Streak", unit: "days" },
];

function RankRow({ entry, unit }: { entry: LeaderboardEntryDto; unit: string }) {
  return (
    <li
      className={
        entry.isSelf
          ? "flex items-center gap-3 border-b border-border bg-accent/5 px-5 py-3 last:border-b-0"
          : "flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0"
      }
    >
      <span className="w-8 shrink-0 text-right font-display text-sm font-bold tabular-nums text-muted">
        {entry.rank}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          href={`/app/profile/${entry.username}`}
          className="truncate text-sm font-medium text-foreground hover:text-link"
        >
          {entry.displayName ?? entry.username}
        </Link>
        <p className="text-xs text-muted">
          @{entry.username} · level {entry.level}
          {entry.isSelf ? " · you" : ""}
        </p>
      </div>
      <span className="shrink-0 text-sm tabular-nums text-secondary">
        {entry.value} {unit}
      </span>
    </li>
  );
}

export default function LeaderboardsPage() {
  const [metric, setMetric] = useState<LeaderboardMetric>("xp");

  const board = useQuery({
    queryKey: ["leaderboard", metric],
    queryFn: () => apiFetch<LeaderboardsResponse>(`/leaderboards?metric=${metric}`),
  });

  const active = METRICS.find((option) => option.value === metric)!;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Leaderboard</h1>
        <p className="mt-1 text-sm text-muted">
          Ranked on real activity. Only learners who published their profile appear here — nobody
          is listed by default, and nothing is estimated.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {METRICS.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={metric === option.value ? "primary" : "secondary"}
            aria-pressed={metric === option.value}
            onClick={() => setMetric(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {board.isLoading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : board.isError ? (
        <ErrorState
          title="Couldn't load the leaderboard"
          message="The server didn't respond. Check your connection and try again."
          onRetry={() => void board.refetch()}
        />
      ) : (
        <>
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="size-4 text-accent" aria-hidden />
                Top by {active.label.toLowerCase()}
              </CardTitle>
              <span className="text-xs text-muted">
                {board.data!.rankedProfiles} published profile
                {board.data!.rankedProfiles === 1 ? "" : "s"}
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {board.data!.entries.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    as="h3"
                    title="Nobody has published a profile yet"
                    description="Turn on Public in Settings to be the first name on the board."
                    action={
                      <Link href="/app/settings">
                        <Button size="sm">Open settings</Button>
                      </Link>
                    }
                  />
                </div>
              ) : (
                <ul>
                  {board.data!.entries.map((entry) => (
                    <RankRow key={entry.username} entry={entry} unit={active.unit} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {board.data!.viewer ? (
            <Card>
              <CardHeader>
                <CardTitle>Your position</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul>
                  <RankRow entry={board.data!.viewer} unit={active.unit} />
                </ul>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                <p className="text-sm text-muted">
                  You are not on this board because your profile is private. Publishing is a
                  choice — your activity is never shared without it.
                </p>
                <Link href="/app/settings">
                  <Button size="sm" variant="secondary">
                    Publish my profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <Badge>Opt-in only</Badge>
            <span>
              XP is derived the same way as your own XP page; streaks use your recorded longest
              streak.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
