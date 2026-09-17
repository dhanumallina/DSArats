"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, Target } from "lucide-react";
import { LIMITS } from "@dsarats/shared";
import type { MeResponse, PublicUser } from "@dsarats/shared";
import { apiFetch, getErrorMessage } from "@/lib/api";
import { useMe } from "@/hooks/use-me";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

/** A practical shortlist — any valid IANA zone still works (the current one is kept). */
const COMMON_TIMEZONES = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Kathmandu",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Africa/Lagos",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "America/Sao_Paulo",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
];

function SettingsForm({ user }: { user: PublicUser }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState(user.profile?.displayName ?? "");
  const [bio, setBio] = useState(user.profile?.bio ?? "");
  const [timezone, setTimezone] = useState(user.profile?.timezone ?? "UTC");
  const [goal, setGoal] = useState(
    user.profile?.learningGoal != null ? String(user.profile.learningGoal) : "",
  );

  // Keep the saved zone selectable even when it is not in the shortlist.
  const timezones = COMMON_TIMEZONES.includes(timezone)
    ? COMMON_TIMEZONES
    : [timezone, ...COMMON_TIMEZONES];

  const goalValue = goal.trim();
  const goalError =
    goalValue !== "" &&
    (!/^\d+$/.test(goalValue) ||
      Number(goalValue) < LIMITS.WEEKLY_GOAL_MIN ||
      Number(goalValue) > LIMITS.WEEKLY_GOAL_MAX)
      ? `Enter a whole number between ${LIMITS.WEEKLY_GOAL_MIN} and ${LIMITS.WEEKLY_GOAL_MAX}, or leave it empty.`
      : undefined;

  const save = useMutation({
    mutationFn: () =>
      apiFetch<MeResponse>("/users/me/profile", {
        method: "PATCH",
        body: {
          // Empty text clears the field (the API accepts null).
          displayName: displayName.trim() === "" ? null : displayName.trim(),
          bio: bio.trim() === "" ? null : bio.trim(),
          timezone,
          learningGoal: goalValue === "" ? null : Number(goalValue),
        },
      }),
    onSuccess: (res) => {
      // The signed-in user changed — refresh /me plus anything derived from the profile.
      queryClient.setQueryData<MeResponse>(["me"], res);
      for (const key of ["dashboard", "streak", "progress", "heatmap", "revision"]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
      toast("Settings saved.", "success");
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (goalError) return;
        save.mutate();
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            label="Display name"
            value={displayName}
            maxLength={LIMITS.DISPLAY_NAME_MAX}
            hint="Shown in your greeting. Leave empty to use your username."
            onChange={(event) => setDisplayName(event.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bio" className="text-sm font-medium text-foreground">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              maxLength={LIMITS.BIO_MAX}
              rows={3}
              placeholder="A line about what you're working towards"
              onChange={(event) => setBio(event.target.value)}
              className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted transition-colors duration-150 hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent/60"
            />
            <p className="text-sm text-muted">
              {bio.length}/{LIMITS.BIO_MAX} characters
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-4 text-accent" aria-hidden />
            Timezone
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Select
            label="Your timezone"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
          >
            {timezones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </Select>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)}
            >
              Use my browser timezone
            </Button>
            <span className="text-sm text-muted">Currently: {timezone}</span>
          </div>
          <p className="text-sm text-muted">
            Streaks and daily activity are measured against this timezone, so a day ends when
            it ends for you — not on the server clock.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-4 text-accent" aria-hidden />
            Weekly goal
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input
            label="Problems solved per week"
            type="number"
            inputMode="numeric"
            min={LIMITS.WEEKLY_GOAL_MIN}
            max={LIMITS.WEEKLY_GOAL_MAX}
            value={goal}
            placeholder="No goal"
            error={goalError}
            hint={`Between ${LIMITS.WEEKLY_GOAL_MIN} and ${LIMITS.WEEKLY_GOAL_MAX}. Leave empty for no goal.`}
            onChange={(event) => setGoal(event.target.value)}
            className="max-w-40"
          />
          <p className="text-sm text-muted">
            Your dashboard shows progress toward this goal using problems you actually solved
            this week.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={save.isPending} disabled={!!goalError}>
          Save changes
        </Button>
        <span aria-live="polite" className="text-sm text-muted">
          {save.isPending ? "Saving…" : save.isError ? "Couldn't save — try again" : ""}
        </span>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const me = useMe();

  if (me.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (me.isError || !me.data?.user?.profile) {
    return (
      <ErrorState
        title="Couldn't load your settings"
        message="The server didn't respond. Check your connection and try again."
        onRetry={() => void me.refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Your profile, timezone, and weekly goal. Changes apply everywhere immediately.
        </p>
      </div>

      <SettingsForm user={me.data.user} />
    </div>
  );
}
