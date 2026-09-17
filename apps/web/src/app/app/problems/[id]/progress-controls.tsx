"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Flag, RotateCcw, Sparkles } from "lucide-react";
import { REVISION_INTERVALS_DAYS } from "@dsarats/shared";
import type {
  ProblemProgressResponse,
  ProblemStatus,
  RevisionStateDto,
  UserProblemProgressDto,
} from "@dsarats/shared";
import { apiFetch, getErrorMessage } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Short, text-labelled status — meaning never depends on colour alone. */
const STATUS_LABEL: Record<ProblemStatus, string> = {
  NOT_STARTED: "Not started",
  ATTEMPTED: "Attempted",
  SOLVED: "Solved",
  NEEDS_REVISION: "Needs revision",
  REVISED: "Revised",
  MASTERED: "Mastered",
};

const STATUS_TONE: Record<ProblemStatus, "neutral" | "accent" | "success" | "error"> = {
  NOT_STARTED: "neutral",
  ATTEMPTED: "accent",
  SOLVED: "success",
  NEEDS_REVISION: "error",
  REVISED: "success",
  MASTERED: "success",
};

/** Every action the user can take from this page, in the order they appear. */
const ACTIONS: Array<{
  status: ProblemStatus;
  label: string;
  variant: "primary" | "secondary" | "ghost";
  icon: typeof CheckCircle2;
}> = [
  { status: "ATTEMPTED", label: "Attempted", variant: "secondary", icon: Flag },
  { status: "SOLVED", label: "Solved it", variant: "primary", icon: CheckCircle2 },
  { status: "NEEDS_REVISION", label: "Needs revision", variant: "secondary", icon: Flag },
  { status: "MASTERED", label: "Mastered", variant: "secondary", icon: Sparkles },
];

/** One honest line describing where this problem stands in the revision cycle. */
function RevisionLine({ revision }: { revision: RevisionStateDto }) {
  return (
    <p className="text-sm text-secondary">
      {revision.daysOverdue > 0 ? (
        <Badge tone="error" className="mr-2">
          {revision.daysOverdue}d overdue
        </Badge>
      ) : (
        <Badge tone="neutral" className="mr-2">
          due today
        </Badge>
      )}
      Stage {revision.stage + 1} of {REVISION_INTERVALS_DAYS.length} · reviewed{" "}
      {revision.timesReviewed} time{revision.timesReviewed === 1 ? "" : "s"}
      {revision.lastReviewedAt ? ` · last on ${revision.lastReviewedAt.slice(0, 10)}` : ""}
    </p>
  );
}

export function ProgressControls({
  problemId,
  viewer,
  revision,
}: {
  problemId: string;
  viewer: UserProblemProgressDto | null;
  revision: RevisionStateDto | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const status = viewer?.status ?? "NOT_STARTED";

  const setStatus = useMutation({
    mutationFn: (next: ProblemStatus) =>
      apiFetch<ProblemProgressResponse>(`/problems/${problemId}/progress`, {
        method: "PATCH",
        body: { status: next },
      }),
    onSuccess: (res, next) => {
      // A status change feeds the streak, analytics, revision queue, and this page's
      // own detail payload — refresh all of them so nothing shows stale numbers.
      for (const key of [
        "problem",
        "problems",
        "dashboard",
        "progress",
        "streak",
        "heatmap",
        "revision",
        "revision-history",
        "daily-challenge",
        "analytics",
        "achievements",
      ]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }

      const label = STATUS_LABEL[next].toLowerCase();
      toast(
        res.streak.activeToday
          ? `Marked ${label} — ${res.streak.current}-day streak.`
          : `Marked ${label}.`,
        next === "ATTEMPTED" ? "info" : "success",
      );
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Your progress</CardTitle>
        <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {ACTIONS.map((action) => (
            <Button
              key={action.status}
              size="sm"
              variant={status === action.status ? "primary" : action.variant}
              aria-pressed={status === action.status}
              loading={setStatus.isPending && setStatus.variables === action.status}
              onClick={() => setStatus.mutate(action.status)}
            >
              <action.icon className="size-4" aria-hidden />
              {action.label}
            </Button>
          ))}
          {status !== "NOT_STARTED" ? (
            <Button
              size="sm"
              variant="ghost"
              loading={setStatus.isPending && setStatus.variables === "NOT_STARTED"}
              onClick={() => setStatus.mutate("NOT_STARTED")}
            >
              Reset
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4">
          <RotateCcw className="size-4 shrink-0 text-accent" aria-hidden />
          {revision ? (
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                Next review{" "}
                <span className="font-medium">{revision.dueAt.slice(0, 10)}</span>
              </p>
              <RevisionLine revision={revision} />
            </div>
          ) : (
            <p className="min-w-0 flex-1 text-sm text-muted">
              {status === "MASTERED"
                ? "Mastered — no longer scheduled. Solve it again to restart the cycle."
                : "Solve this problem and DSARats will schedule it at 1 → 3 → 7 → 14 → 30 days."}
            </p>
          )}
          <Link href="/app/revision" className="shrink-0">
            <Button size="sm" variant="secondary">
              Revision queue
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted">
          Status is yours to set — it drives your streak, progress, and revision schedule.
          Nothing here is inferred.
        </p>
      </CardContent>
    </Card>
  );
}
