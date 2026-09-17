"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, LogOut, RefreshCcw, RotateCcw, Target, Users } from "lucide-react";
import type {
  ActivityType,
  CommunityActivityResponse,
  GroupVisibility,
  StudyGroupDto,
  StudyGroupResponse,
  StudyGroupsResponse,
} from "@dsarats/shared";
import { apiFetch, getErrorMessage } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const ACTIVITY_LABEL: Record<ActivityType, string> = {
  PROBLEM_SOLVED: "solved",
  PROBLEM_ATTEMPTED: "attempted",
  REVISION_COMPLETED: "revised",
  DAILY_CHALLENGE: "completed the daily challenge on",
  NOTE_UPDATED: "updated notes on",
  LEARNING_SESSION: "studied",
};

const ACTIVITY_ICON: Record<ActivityType, typeof CheckCircle2> = {
  PROBLEM_SOLVED: CheckCircle2,
  PROBLEM_ATTEMPTED: Target,
  REVISION_COMPLETED: RotateCcw,
  DAILY_CHALLENGE: RefreshCcw,
  NOTE_UPDATED: RefreshCcw,
  LEARNING_SESSION: RefreshCcw,
};

function relativeTime(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function GroupRow({
  group,
  onJoin,
  onLeave,
  pending,
}: {
  group: StudyGroupDto;
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
  pending: boolean;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{group.name}</span>
          {group.visibility === "PRIVATE" ? <Badge>Invite only</Badge> : null}
          {group.viewerRole === "OWNER" ? <Badge tone="accent">Owner</Badge> : null}
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
          {group.createdBy ? ` · started by ${group.createdBy.displayName ?? group.createdBy.username}` : ""}
        </p>
        {group.description ? (
          <p className="mt-1 text-sm text-secondary">{group.description}</p>
        ) : null}
      </div>

      {group.joined ? (
        // The owner has no leave button: the API refuses it, so offering it would be a lie.
        group.viewerRole === "OWNER" ? null : (
          <Button
            size="sm"
            variant="secondary"
            loading={pending}
            onClick={() => onLeave(group.id)}
          >
            <LogOut className="size-4" aria-hidden />
            Leave
          </Button>
        )
      ) : (
        <Button size="sm" loading={pending} onClick={() => onJoin(group.id)}>
          Join
        </Button>
      )}
    </li>
  );
}

function CreateGroupForm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<GroupVisibility>("PUBLIC");

  const create = useMutation({
    mutationFn: () =>
      apiFetch<StudyGroupResponse>("/community/groups", {
        method: "POST",
        body: {
          name: name.trim(),
          ...(description.trim() === "" ? {} : { description: description.trim() }),
          visibility,
        },
      }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["study-groups"] });
      setName("");
      setDescription("");
      toast(`Created ${res.group.name}.`, "success");
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim().length < 3) return;
        create.mutate();
      }}
    >
      <Input
        label="Group name"
        value={name}
        maxLength={60}
        placeholder="Graph Grinders"
        onChange={(event) => setName(event.target.value)}
      />
      <Input
        label="Description"
        value={description}
        maxLength={500}
        placeholder="What will this group work through?"
        onChange={(event) => setDescription(event.target.value)}
      />
      <Select
        label="Visibility"
        value={visibility}
        onChange={(event) => setVisibility(event.target.value as GroupVisibility)}
      >
        <option value="PUBLIC">Public — anyone can find and join</option>
        <option value="PRIVATE">Invite only — members only, hidden from the list</option>
      </Select>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" loading={create.isPending} disabled={name.trim().length < 3}>
          Create group
        </Button>
        <span className="text-xs text-muted">You become the owner and first member.</span>
      </div>
    </form>
  );
}

export default function CommunityPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const groups = useQuery({
    queryKey: ["study-groups"],
    queryFn: () => apiFetch<StudyGroupsResponse>("/community/groups"),
  });
  const activity = useQuery({
    queryKey: ["community-activity"],
    queryFn: () => apiFetch<CommunityActivityResponse>("/community/activity"),
  });

  const join = useMutation({
    mutationFn: (groupId: string) =>
      apiFetch<StudyGroupResponse>(`/community/groups/${groupId}/join`, { method: "POST" }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["study-groups"] });
      toast(`Joined ${res.group.name}.`, "success");
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const leave = useMutation({
    mutationFn: (groupId: string) =>
      apiFetch<StudyGroupResponse>(`/community/groups/${groupId}/leave`, { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["study-groups"] });
      toast("Left the group.", "info");
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  if (groups.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (groups.isError) {
    return (
      <ErrorState
        title="Couldn't load the community"
        message="The server didn't respond. Check your connection and try again."
        onRetry={() => void groups.refetch()}
      />
    );
  }

  const list = groups.data?.groups ?? [];
  const pendingId = join.isPending ? join.variables : leave.isPending ? leave.variables : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Community</h1>
        <p className="mt-1 text-sm text-muted">
          Study groups and recent activity from learners who chose to publish their profile.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="size-4 text-accent" aria-hidden />
            Study groups
          </CardTitle>
          <Link href="/app/leaderboards" className="text-sm text-link hover:underline">
            Leaderboard
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="p-5">
              <EmptyState
                as="h3"
                title="No groups yet"
                description="Start one below — a group is just a place to keep a small set of learners pointed at the same work."
              />
            </div>
          ) : (
            <ul>
              {list.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  pending={pendingId === group.id}
                  onJoin={(id) => join.mutate(id)}
                  onLeave={(id) => leave.mutate(id)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Start a group</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateGroupForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activity.isLoading ? (
            <div className="p-5">
              <Skeleton lines={3} />
            </div>
          ) : activity.isError ? (
            <p className="px-5 py-6 text-sm text-muted">
              We couldn&apos;t load recent activity right now.
            </p>
          ) : (activity.data?.items.length ?? 0) === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">
              Nothing here yet. Activity appears when learners who published their profile make
              progress.
            </p>
          ) : (
            <ul>
              {activity.data!.items.map((item, index) => {
                const Icon = ACTIVITY_ICON[item.type];
                return (
                  <li
                    key={`${item.username}-${item.occurredAt}-${index}`}
                    className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0"
                  >
                    <Icon className="size-4 shrink-0 text-accent" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-secondary">
                        <Link
                          href={`/app/profile/${item.username}`}
                          className="font-medium text-foreground hover:text-link"
                        >
                          {item.displayName ?? item.username}
                        </Link>{" "}
                        {ACTIVITY_LABEL[item.type]}
                        {item.problemTitle ? (
                          <span className="text-foreground"> {item.problemTitle}</span>
                        ) : null}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted">{relativeTime(item.occurredAt)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
