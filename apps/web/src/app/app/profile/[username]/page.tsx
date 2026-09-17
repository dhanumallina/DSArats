"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Award, Flame, Lock, Target, Zap } from "lucide-react";
import type { PublicProfileResponse } from "@dsarats/shared";
import { ApiError, apiFetch } from "@/lib/api";
import { useMe } from "@/hooks/use-me";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <p className="font-display text-xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const me = useMe();

  const profile = useQuery({
    queryKey: ["public-profile", username],
    queryFn: () => apiFetch<PublicProfileResponse>(`/users/${username}`),
    retry: false,
  });

  if (profile.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (profile.isError) {
    const notFound = profile.error instanceof ApiError && profile.error.status === 404;
    const isSelfHandle = me.data?.user?.profile?.username === username;

    if (notFound) {
      return isSelfHandle ? (
        // The owner can always read their own profile, so a 404 here means the request
        // raced the session rather than the profile being hidden.
        <ErrorState
          title="Couldn't load your profile"
          message="Refresh the page to try again."
          onRetry={() => void profile.refetch()}
        />
      ) : (
        <EmptyState
          as="h1"
          title="Profile not available"
          description="This learner either doesn't exist or keeps their profile private. Private profiles are never shown to anyone else."
          action={
            <Link href="/app/community">
              <Button variant="secondary" size="sm">
                Back to community
              </Button>
            </Link>
          }
        />
      );
    }

    return (
      <ErrorState
        title="Couldn't load this profile"
        message="The server didn't respond. Check your connection and try again."
        onRetry={() => void profile.refetch()}
      />
    );
  }

  const data = profile.data!.profile;
  const { stats } = data;
  const name = data.displayName ?? data.username;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent/20 font-display text-xl font-bold text-accent-hover dark:text-accent">
            {name[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">{name}</h1>
            <p className="text-sm text-muted">
              @{data.username} · joined {data.joinedAt.slice(0, 10)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data.isSelf ? <Badge tone="accent">This is you</Badge> : null}
          {data.visibility === "PRIVATE" ? (
            <Badge tone="neutral">
              <Lock className="size-3" aria-hidden /> Private
            </Badge>
          ) : (
            <Badge tone="success">Published</Badge>
          )}
          {data.isSelf ? (
            <Link href="/app/settings">
              <Button variant="secondary" size="sm">
                Edit settings
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      {data.bio ? <p className="max-w-2xl text-sm text-secondary">{data.bio}</p> : null}

      {data.isSelf && data.visibility === "PRIVATE" ? (
        <p className="rounded-lg border border-border bg-surface-secondary px-4 py-3 text-sm text-muted">
          Only you can see this page. Turn on <strong>Public</strong> in{" "}
          <Link href="/app/settings" className="text-link hover:underline">
            Settings
          </Link>{" "}
          to share it and appear on the leaderboard.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Solved" value={stats.solved} />
        <Stat label="Mastered" value={stats.mastered} />
        <Stat label="Current streak" value={`${stats.currentStreak}d`} />
        <Stat label="Longest streak" value={`${stats.longestStreak}d`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="size-4 text-accent" aria-hidden />
              Level {stats.level}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-secondary">
              {stats.xp} XP earned across {stats.solved} solved problems, {stats.mastered} mastered,
              and {stats.reviewsCompleted} revisions.
            </p>
            <ul className="flex flex-col gap-1.5 text-sm text-muted">
              <li className="flex items-center gap-2">
                <Flame className="size-4 shrink-0 text-accent" aria-hidden />
                {stats.challengesSolved} daily challenges solved
              </li>
              <li className="flex items-center gap-2">
                <Target className="size-4 shrink-0 text-accent" aria-hidden />
                {stats.topicsEngaged} topics practised
              </li>
              <li className="flex items-center gap-2">
                <Award className="size-4 shrink-0 text-accent" aria-hidden />
                {stats.achievementsUnlocked} of {stats.achievementsTotal} badges earned
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-secondary">
              {stats.attempted} problems attempted but not yet solved.
            </p>
            <p className="text-xs text-muted">
              Notebook entries, exact activity times, and anything else the learner has not
              chosen to share are never part of a public profile.
            </p>
            <Link href="/app/leaderboards" className="text-sm text-link hover:underline">
              See how this compares on the leaderboard
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
