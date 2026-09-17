"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Flame,
  Layers,
  RotateCcw,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import type {
  AchievementDto,
  AchievementsResponse,
  AnalyticsResponse,
  ReadinessFactorDto,
  RevisionActivityDto,
  SolvedOverTimePointDto,
  XpSummaryDto,
} from "@dsarats/shared";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
const DIFFICULTY_LABEL: Record<(typeof DIFFICULTIES)[number], string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

/** How many topics the chart lists before deferring to the Progress page. */
const TOPIC_LIMIT = 8;

/** Catalogue `iconKey` → icon. Unknown keys fall back, so a new badge never breaks. */
const ACHIEVEMENT_ICON: Record<string, typeof Award> = {
  check: CheckCircle2,
  rotate: RotateCcw,
  target: Target,
  flame: Flame,
  layers: Layers,
  calendar: CalendarDays,
  zap: Zap,
  award: Award,
  book: BookOpen,
  trophy: Trophy,
};

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <p className="font-display text-xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted">{label}</p>
      {note ? <p className="mt-0.5 text-xs text-muted">{note}</p> : null}
    </div>
  );
}

/**
 * Solves per day over the trailing window.
 *
 * A hand-rolled SVG path rather than a charting dependency: the series is one line, and
 * the design system already asks for a simplified chart on small screens. The summary in
 * the caption is also the accessible description, so the data is never colour-only.
 */
function SolvedChart({ points }: { points: SolvedOverTimePointDto[] }) {
  const max = Math.max(1, ...points.map((point) => point.solved));
  const total = points.reduce((sum, point) => sum + point.solved, 0);
  const busiest = points.reduce(
    (best, point) => (point.solved > best.solved ? point : best),
    { date: "", solved: 0 } as SolvedOverTimePointDto,
  );
  const step = points.length > 1 ? 100 / (points.length - 1) : 0;

  const line = points
    .map((point, index) => {
      const x = index * step;
      const y = 100 - (point.solved / max) * 100;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <figure className="flex flex-col gap-2">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-32 w-full"
        role="img"
        aria-label={`Problems solved per day over the last ${points.length} days: ${total} in total, busiest day ${busiest.solved}`}
      >
        <path d={`${line} L100,100 L0,100 Z`} className="fill-accent/15" />
        <path
          d={line}
          className="fill-none stroke-accent"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{points[0]?.date}</span>
        <figcaption>
          {total} solved in the last {points.length} days · busiest {busiest.solved}
        </figcaption>
        <span>{points.at(-1)?.date}</span>
      </div>
    </figure>
  );
}

function Factor({ factor }: { factor: ReadinessFactorDto }) {
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-foreground">{factor.label}</span>
        <span className="shrink-0 tabular-nums text-muted">
          {Math.round(factor.value * 100)}% · {Math.round(factor.weight * 100)}% weight
        </span>
      </div>
      <ProgressBar value={factor.value * 100} />
      <p className="text-xs text-muted">{factor.detail}</p>
    </li>
  );
}

function XpBreakdown({ xp }: { xp: XpSummaryDto }) {
  const span = xp.pointsIntoLevel + xp.pointsToNextLevel;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-foreground">
            {xp.total} XP · Level {xp.level}
          </span>
          <span className="tabular-nums text-muted">
            {xp.pointsToNextLevel} to level {xp.level + 1}
          </span>
        </div>
        <ProgressBar value={span === 0 ? 0 : (xp.pointsIntoLevel / span) * 100} />
      </div>

      <ul className="flex flex-col gap-2">
        {xp.sources.map((source) => (
          <li key={source.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-secondary">
              {source.label}{" "}
              <span className="text-muted">
                ({source.count} × {source.pointsEach})
              </span>
            </span>
            <span className="shrink-0 tabular-nums text-foreground">{source.points}</span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted">
        XP is worked out from these counts every time you load the page, so it always adds
        up to the activity below. Re-solving a problem does not pay twice.
      </p>
    </div>
  );
}

function RevisionStats({ revision }: { revision: RevisionActivityDto }) {
  const items = [
    { label: "Reviews completed", value: revision.totalReviews },
    { label: "Last 30 days", value: revision.reviewsLast30Days },
    { label: "Scheduled", value: revision.activeSchedules },
    { label: "Due now", value: revision.dueNow },
    { label: "Overdue", value: revision.overdue },
    { label: "Mastered", value: revision.mastered },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border px-3 py-2">
          <p className="font-display text-lg font-bold tabular-nums text-foreground">
            {item.value}
          </p>
          <p className="text-xs text-muted">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: AchievementDto }) {
  const Icon = ACHIEVEMENT_ICON[achievement.iconKey] ?? Award;

  return (
    <li
      className={
        achievement.unlocked
          ? "flex gap-3 rounded-lg border border-accent/30 bg-accent/5 p-3"
          : "flex gap-3 rounded-lg border border-border p-3"
      }
    >
      <Icon
        className={achievement.unlocked ? "size-5 shrink-0 text-accent" : "size-5 shrink-0 text-muted"}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">{achievement.name}</span>
          {achievement.unlocked ? (
            <Badge tone="success">Unlocked</Badge>
          ) : (
            <span className="text-xs tabular-nums text-muted">
              {achievement.progress}/{achievement.threshold}
            </span>
          )}
        </div>
        <p className="text-xs text-muted">{achievement.description}</p>
        {achievement.unlocked && achievement.unlockedAt ? (
          <p className="text-xs text-muted">Earned {achievement.unlockedAt.slice(0, 10)}</p>
        ) : (
          <ProgressBar value={(achievement.progress / achievement.threshold) * 100} />
        )}
      </div>
    </li>
  );
}

export default function AnalyticsPage() {
  const analytics = useQuery({
    queryKey: ["analytics"],
    queryFn: () => apiFetch<AnalyticsResponse>("/analytics"),
  });
  const achievements = useQuery({
    queryKey: ["achievements"],
    queryFn: () => apiFetch<AchievementsResponse>("/achievements"),
  });

  if (analytics.isLoading) {
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

  if (analytics.isError) {
    return (
      <ErrorState
        title="Couldn't load your analytics"
        message="The server didn't respond. Check your connection and try again."
        onRetry={() => void analytics.refetch()}
      />
    );
  }

  const data = analytics.data!;
  const topics = [...data.byTopic]
    .filter((topic) => topic.total > 0)
    .sort(
      (a, b) =>
        b.solved / b.total - a.solved / a.total ||
        b.total - a.total ||
        a.topic.name.localeCompare(b.topic.name),
    )
    .slice(0, TOPIC_LIMIT);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Analytics</h1>
        <p className="mt-1 text-sm text-muted">
          Charted straight from your own activity. Nothing is estimated except the readiness
          score, which is labelled as an estimate.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Solved" value={`${data.totals.solved}`} note={`of ${data.totals.publishedProblems}`} />
        <Stat
          label="Success rate"
          value={data.successRate === null ? "—" : `${Math.round(data.successRate * 100)}%`}
          note={data.successRate === null ? "No attempts yet" : `${data.totals.attempted} attempted`}
        />
        <Stat label="Level" value={`${data.xp.level}`} note={`${data.xp.total} XP`} />
        <Stat label="Reviews" value={`${data.revision.totalReviews}`} note="all time" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solved over time</CardTitle>
        </CardHeader>
        <CardContent>
          <SolvedChart points={data.solvedOverTime} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By difficulty</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {DIFFICULTIES.map((difficulty) => {
              const bucket = data.byDifficulty[difficulty];
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
            <CardTitle>Revision activity</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <RevisionStats revision={data.revision} />
            {data.revision.dueNow > 0 ? (
              <Link href="/app/revision" className="text-sm text-link hover:underline">
                {data.revision.dueNow} due now — open the revision queue
              </Link>
            ) : (
              <p className="text-sm text-muted">Nothing is due right now.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weakest topics first</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {topics.length === 0 ? (
            <p className="text-sm text-muted">No topics published yet.</p>
          ) : (
            <>
              {topics.map((topic) => (
                <div key={topic.topic.slug} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-foreground">{topic.topic.name}</span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {topic.solved}/{topic.total}
                    </span>
                  </div>
                  <ProgressBar value={topic.total === 0 ? 0 : (topic.solved / topic.total) * 100} />
                </div>
              ))}
              <Link href="/app/progress" className="text-sm text-link hover:underline">
                See all topics and your full history
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>Interview readiness</CardTitle>
            <Badge tone={data.readiness.score >= 50 ? "success" : "neutral"}>
              {data.readiness.band}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-4xl font-bold tabular-nums text-foreground">
                {data.readiness.score}
              </span>
              <span className="text-sm text-muted">out of 100</span>
            </div>

            <ul className="flex flex-col gap-3">
              {data.readiness.factors.map((factor) => (
                <Factor key={factor.key} factor={factor} />
              ))}
            </ul>

            <p className="rounded-lg border border-border bg-surface-secondary px-3 py-2 text-xs text-muted">
              {data.readiness.disclaimer}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>Experience</CardTitle>
            <Badge tone="accent">Level {data.xp.level}</Badge>
          </CardHeader>
          <CardContent>
            <XpBreakdown xp={data.xp} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>Achievements</CardTitle>
          {achievements.data ? (
            <span className="text-sm tabular-nums text-muted">
              {achievements.data.unlockedCount}/{achievements.data.totalCount} unlocked
            </span>
          ) : null}
        </CardHeader>
        <CardContent>
          {achievements.isLoading ? (
            <Skeleton lines={3} />
          ) : achievements.isError ? (
            <p className="text-sm text-muted">
              We couldn&apos;t load your achievements right now. Reload the page to try again.
            </p>
          ) : (achievements.data?.achievements.length ?? 0) === 0 ? (
            <EmptyState
              as="h3"
              title="No achievements yet"
              description="Achievements appear as soon as you solve your first problem."
            />
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {achievements.data!.achievements.map((achievement) => (
                <AchievementCard key={achievement.key} achievement={achievement} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
