"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Layers } from "lucide-react";
import type { SheetSummary, SheetsListResponse, StartSheetResponse } from "@dsarats/shared";
import { apiFetch, getErrorMessage } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

const SHEET_DIFFICULTY_LABEL: Record<SheetSummary["difficulty"], string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export default function AppSheetsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["sheets"],
    queryFn: () => apiFetch<SheetsListResponse>("/sheets"),
  });

  const start = useMutation({
    mutationFn: (slug: string) =>
      apiFetch<StartSheetResponse>(`/sheets/${slug}/start`, { method: "POST" }),
    onSuccess: (_res, slug) => {
      void queryClient.invalidateQueries({ queryKey: ["sheets"] });
      void queryClient.invalidateQueries({ queryKey: ["sheet", slug] });
      router.push(`/app/sheets/${slug}`);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load sheets"
        message="The server didn't respond. Check your connection and try again."
        onRetry={() => void refetch()}
      />
    );
  }

  const sheets = data?.sheets ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">DSA Sheets</h1>
        <p className="mt-1 text-sm text-muted">
          Follow a sheet in order, or jump into one you have already started.
        </p>
      </div>

      {sheets.length === 0 ? (
        <EmptyState
          as="h2"
          title="No sheets published yet"
          description="Curated sheets will appear here as soon as they are published."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sheets.map((sheet) => {
            const status = sheet.viewer?.status ?? null;
            const started = sheet.viewer?.started ?? false;

            return (
              <Card key={sheet.slug}>
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-accent/10 text-accent-hover dark:text-accent">
                      <Layers className="size-4" aria-hidden />
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {status ? (
                        <Badge tone={status === "COMPLETED" ? "success" : "accent"}>
                          {STATUS_LABEL[status] ?? status}
                        </Badge>
                      ) : null}
                      <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-secondary">
                        {SHEET_DIFFICULTY_LABEL[sheet.difficulty]}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-display text-lg font-semibold">{sheet.name}</h2>
                    <p className="mt-1 text-sm text-muted">{sheet.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary">
                    <span className="font-medium text-foreground">
                      {sheet.problemCount} problem{sheet.problemCount === 1 ? "" : "s"}
                    </span>
                    {sheet.estimatedHours ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" aria-hidden />~{sheet.estimatedHours}h
                      </span>
                    ) : null}
                    <span>{sheet.topics.length} topics</span>
                  </div>

                  <div className="mt-auto flex items-center gap-2 pt-3">
                    {started ? (
                      <Link href={`/app/sheets/${sheet.slug}`}>
                        <Button size="sm" variant={status === "COMPLETED" ? "secondary" : "primary"}>
                          {status === "COMPLETED" ? "Review sheet" : "Continue"}
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        loading={start.isPending && start.variables === sheet.slug}
                        onClick={() => start.mutate(sheet.slug)}
                      >
                        Start sheet
                      </Button>
                    )}
                    <Link
                      href={`/app/practice?sheet=${sheet.slug}`}
                      className="text-sm text-secondary hover:text-foreground"
                    >
                      Browse problems
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
