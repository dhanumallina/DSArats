"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ExternalLink, Flame, Layers, RotateCcw, Target } from "lucide-react";
import type { DashboardResponse } from "@dsarats/shared";
import { apiFetch } from "@/lib/api";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardGreeting } from "./dashboard-greeting";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Deterministic weekday label (UTC) so server and client render identically. */
function weekdayLabel(date: string): string {
  return WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()] ?? "";
}

function StatCard({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-5">
        <Icon className="size-5 text-accent" aria-hidden />
        <div>
          <p className="font-display text-2xl font-bold tabular-nums text-foreground">{value}</p>
          <p className="text-sm text-secondary">{label}</p>
          <p className="text-xs text-muted">{note}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardResponse>("/dashboard"),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton lines={2} className="max-w-md" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Couldn't load your dashboard"
        message="The server didn't respond. Check your connection and try again."
        onRetry={() => void refetch()}
      />
    );
  }

  const { stats, challenge, continueLearning, weeklyActivity, topicProgress, revisionDue, insight } =
    data;
  const maxWeekly = Math.max(1, ...weeklyActivity.map((day) => day.count));

  return (
    <div className="flex flex-col gap-6">
      <DashboardGreeting />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Flame}
          label="Current streak"
          value={`${stats.currentStreak} day${stats.currentStreak === 1 ? "" : "s"}`}
          note={stats.activeToday ? "Active today" : "Practise today to keep it"}
        />
        <StatCard
          icon={Layers}
          label="Problems solved"
          value={`${stats.solved}`}
          note={`of ${stats.totalProblems} published`}
        />
        <StatCard
          icon={Target}
          label="This week"
          value={
            stats.weeklyGoal ? `${stats.weeklySolved}/${stats.weeklyGoal}` : `${stats.weeklySolved}`
          }
          note={stats.weeklyGoal ? "Toward your weekly goal" : "Solved this week"}
        />
        <StatCard
          icon={RotateCcw}
          label="Revision due"
          value={`${revisionDue.count}`}
          note={revisionDue.count > 0 ? "Ready to review" : "Nothing due today"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Challenge</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {challenge.challenge ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/app/problems/${challenge.challenge.problem.id}`}
                  className="font-display text-lg font-semibold text-foreground hover:text-link"
                >
                  {challenge.challenge.problem.title}
                </Link>
                <DifficultyBadge difficulty={challenge.challenge.problem.difficulty} />
                {challenge.completion ? (
                  <Badge tone={challenge.completion.status === "SOLVED" ? "success" : "accent"}>
                    {challenge.completion.status === "SOLVED" ? "Solved" : "Attempted"}
                  </Badge>
                ) : null}
              </div>

              {challenge.challenge.reason ? (
                <p className="text-sm text-muted">{challenge.challenge.reason}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={challenge.challenge.problem.platformProblemUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm">
                    Open problem
                    <ExternalLink className="size-4" aria-hidden />
                  </Button>
                </a>
                <Link href="/app/daily-challenge">
                  <Button size="sm" variant="secondary">
                    {challenge.completion ? "View challenge" : "Mark it done"}
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <EmptyState
              as="h3"
              title="No challenge available yet"
              description="A daily challenge appears once the problem catalog is published."
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Continue Learning</CardTitle>
        </CardHeader>
        <CardContent>
          {continueLearning.length === 0 ? (
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
          ) : (
            <ul className="flex flex-col gap-3">
              {continueLearning.map((item) => (
                <li
                  key={item.sheet.slug}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent-hover dark:text-accent">
                      <Layers className="size-4" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.sheet.name}
                      </p>
                      <p className="text-xs text-muted">
                        {item.solved} of {item.total} solved
                        {item.currentTopic ? ` · ${item.currentTopic.name}` : ""}
                      </p>
                    </div>
                  </div>
                  <Link href={`/app/sheets/${item.sheet.slug}`}>
                    <Button size="sm" variant="secondary">
                      Continue
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {revisionDue.count > 0 ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="size-4 text-accent" aria-hidden />
              Revision Due
            </CardTitle>
            <Link href="/app/revision">
              <Button size="sm" variant="secondary">
                Review all
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <ul>
              {revisionDue.items.map((item) => (
                <li
                  key={item.problemId}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3 last:border-b-0"
                >
                  <Link
                    href={`/app/problems/${item.problemId}`}
                    className="truncate text-sm font-medium text-foreground hover:text-link"
                  >
                    {item.title}
                  </Link>
                  <div className="flex items-center gap-3">
                    <DifficultyBadge difficulty={item.difficulty} />
                    <span className="text-xs text-muted">
                      {item.daysOverdue > 0 ? `${item.daysOverdue}d overdue` : "due today"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4 text-accent" aria-hidden />
              Weekly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2" role="group" aria-label="Weekly activity">
              {weeklyActivity.map((day) => (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="flex h-24 w-full items-end rounded-md bg-surface-secondary"
                    title={`${day.count} activit${day.count === 1 ? "y" : "ies"}`}
                  >
                    <div
                      className="w-full rounded-md bg-accent transition-[height] duration-300 ease-out"
                      style={{ height: `${Math.max(day.count === 0 ? 0 : 8, (day.count / maxWeekly) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted">{weekdayLabel(day.date)}</span>
                  <span className="text-xs tabular-nums text-secondary">{day.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Topic Progress</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {topicProgress.length === 0 ? (
              <p className="text-sm text-muted">
                Solve your first problem to see topic coverage here.
              </p>
            ) : (
              topicProgress.map((topic) => (
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Insight</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-secondary">{insight}</p>
        </CardContent>
      </Card>
    </div>
  );
}
