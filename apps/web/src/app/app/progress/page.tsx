"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import type { ActivityDayDto, ActivityHeatmapResponse, ProgressSummaryResponse, StreakResponse } from "@dsarats/shared";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
const DIFFICULTY_LABEL: Record<(typeof DIFFICULTIES)[number], string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

function cellTone(count: number): string {
  if (count <= 0) return "bg-surface-secondary";
  if (count === 1) return "bg-accent/30";
  if (count <= 3) return "bg-accent/60";
  return "bg-accent";
}

/**
 * A Sunday-first year grid. Built from UTC date math so the server and client render
 * the same cells — no locale or timezone dependence in the markup.
 */
function buildYearGrid(year: number, active: Map<string, ActivityDayDto>) {
  const days: Array<{ date: string; count: number }> = [];
  for (
    let cursor = Date.UTC(year, 0, 1);
    cursor <= Date.UTC(year, 11, 31);
    cursor += 24 * 60 * 60 * 1000
  ) {
    const date = new Date(cursor).toISOString().slice(0, 10);
    days.push({ date, count: active.get(date)?.count ?? 0 });
  }

  const lead = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  const cells: Array<{ date: string; count: number } | null> = [
    ...Array.from({ length: lead }, () => null),
    ...days,
  ];

  const weeks: Array<Array<{ date: string; count: number } | null>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <p className="font-display text-xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

export default function ProgressPage() {
  const currentYear = new Date().getUTCFullYear();
  const [year, setYear] = useState(currentYear);

  const summary = useQuery({
    queryKey: ["progress"],
    queryFn: () => apiFetch<ProgressSummaryResponse>("/progress"),
  });
  const streak = useQuery({
    queryKey: ["streak"],
    queryFn: () => apiFetch<StreakResponse>("/streak"),
  });
  const heatmap = useQuery({
    queryKey: ["heatmap", year],
    queryFn: () => apiFetch<ActivityHeatmapResponse>(`/progress/heatmap?year=${year}`),
  });

  if (summary.isLoading || streak.isLoading || heatmap.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (summary.isError || streak.isError || heatmap.isError) {
    return (
      <ErrorState
        title="Couldn't load your progress"
        message="The server didn't respond. Check your connection and try again."
        onRetry={() => {
          void summary.refetch();
          void streak.refetch();
          void heatmap.refetch();
        }}
      />
    );
  }

  const totals = summary.data!.totals;
  const byDifficulty = summary.data!.byDifficulty;
  const byTopic = summary.data!.byTopic;
  const bySheet = summary.data!.bySheet;
  const byStatus = summary.data!.byStatus;
  const streakData = streak.data!;

  const active = new Map<string, ActivityDayDto>(
    (heatmap.data?.days ?? []).map((day) => [day.date, day]),
  );
  const weeks = buildYearGrid(year, active);
  const solvedPct = totals.publishedProblems === 0 ? 0 : (totals.solved / totals.publishedProblems) * 100;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Progress</h1>
        <p className="mt-1 text-sm text-muted">
          Everything here is computed from your own activity — no estimates, no invented numbers.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Solved" value={`${totals.solved}`} />
        <Stat label="Attempted" value={`${totals.attempted}`} />
        <Stat label="Not started" value={`${totals.notStarted}`} />
        <Stat label="Current streak" value={`${streakData.current}d`} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>Activity</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              aria-label="Previous year"
              onClick={() => setYear((y) => Math.max(2000, y - 1))}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <span className="w-12 text-center text-sm tabular-nums text-secondary">{year}</span>
            <Button
              size="sm"
              variant="secondary"
              aria-label="Next year"
              disabled={year >= currentYear}
              onClick={() => setYear((y) => Math.min(currentYear, y + 1))}
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <Flame className="size-4 text-accent" aria-hidden />
              {streakData.current}-day current streak
            </span>
            <span>Longest: {streakData.longest} days</span>
            <span>{heatmap.data?.activeDays ?? 0} active days in {year}</span>
            <span>{heatmap.data?.totalSolved ?? 0} solves</span>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="flex gap-1" role="img" aria-label={`Daily activity for ${year}`}>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((day, di) => (
                    <div
                      key={day?.date ?? `${wi}-${di}`}
                      title={day ? `${day.date}: ${day.count} activit${day.count === 1 ? "y" : "ies"}` : undefined}
                      className={`size-3 rounded-sm ${day ? cellTone(day.count) : "bg-transparent"}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted">
            <span>Less</span>
            <span className="size-3 rounded-sm bg-surface-secondary" />
            <span className="size-3 rounded-sm bg-accent/30" />
            <span className="size-3 rounded-sm bg-accent/60" />
            <span className="size-3 rounded-sm bg-accent" />
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By Difficulty</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {DIFFICULTIES.map((difficulty) => {
              const bucket = byDifficulty[difficulty];
              return (
                <div key={difficulty} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-foreground">{DIFFICULTY_LABEL[difficulty]}</span>
                    <span className="tabular-nums text-muted">
                      {bucket.solved}/{bucket.total}
                    </span>
                  </div>
                  <ProgressBar value={bucket.total === 0 ? 0 : (bucket.solved / bucket.total) * 100} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overall</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-foreground">Catalog coverage</span>
                <span className="tabular-nums text-muted">
                  {totals.solved}/{totals.publishedProblems}
                </span>
              </div>
              <ProgressBar value={solvedPct} />
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(byStatus)
                .filter(([, count]) => count > 0)
                .map(([status, count]) => (
                  <Badge key={status}>
                    {status.replace(/_/g, " ").toLowerCase()} · {count}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By Topic</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {byTopic.length === 0 ? (
            <p className="text-sm text-muted">No topics published yet.</p>
          ) : (
            byTopic.map((topic) => (
              <div key={topic.topic.slug} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-foreground">{topic.topic.name}</span>
                  <span className="shrink-0 tabular-nums text-muted">
                    {topic.solved}/{topic.total}
                  </span>
                </div>
                <ProgressBar value={topic.total === 0 ? 0 : (topic.solved / topic.total) * 100} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>By Sheet</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bySheet.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">No sheets published yet.</p>
          ) : (
            <ul>
              {bySheet.map((sheet) => (
                <li
                  key={sheet.sheet.slug}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{sheet.sheet.name}</p>
                    <p className="text-xs text-muted">
                      {sheet.solved} of {sheet.total} solved
                    </p>
                  </div>
                  <Badge tone={sheet.status === "COMPLETED" ? "success" : sheet.status === "IN_PROGRESS" ? "accent" : "neutral"}>
                    {STATUS_LABEL[sheet.status] ?? sheet.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
