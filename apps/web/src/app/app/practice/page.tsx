"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import type { Difficulty, Platform, ProblemsListResponse, TopicsResponse } from "@dsarats/shared";
import { apiFetch, getErrorMessage } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ProblemRow } from "@/components/problem-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type SortOption = "newest" | "oldest" | "difficulty" | "title";

const DIFFICULTIES: Array<{ value: "" | Difficulty; label: string }> = [
  { value: "", label: "All" },
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

const PLATFORMS: Array<{ value: "" | Platform; label: string }> = [
  { value: "", label: "All platforms" },
  { value: "LEETCODE", label: "LeetCode" },
  { value: "GEEKSFORGEEKS", label: "GeeksforGeeks" },
  { value: "CODEFORCES", label: "Codeforces" },
  { value: "OTHER", label: "Other" },
];

const SORTS: Array<{ value: SortOption; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "difficulty", label: "Difficulty" },
  { value: "title", label: "Title (A–Z)" },
];

/** Build a query string, dropping empty values so the API sees only real filters. */
function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return search.toString();
}

function PracticeExplorer() {
  const searchParams = useSearchParams();

  const [q, setQ] = useState("");
  const [difficulty, setDifficulty] = useState<"" | Difficulty>("");
  const [topic, setTopic] = useState(() => searchParams.get("topic") ?? "");
  const [platform, setPlatform] = useState<"" | Platform>("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [sheet, setSheet] = useState(() => searchParams.get("sheet") ?? "");

  const debouncedQ = useDebouncedValue(q, 300);

  const topicsQuery = useQuery({
    queryKey: ["topics"],
    queryFn: () => apiFetch<TopicsResponse>("/topics"),
    staleTime: 5 * 60_000,
  });

  const query = useInfiniteQuery({
    queryKey: ["problems", { q: debouncedQ.trim(), difficulty, topic, platform, sort, sheet }],
    queryFn: ({ pageParam }) =>
      apiFetch<ProblemsListResponse>(
        `/problems?${buildQuery({
          q: debouncedQ.trim(),
          difficulty,
          topic,
          platform,
          sort,
          sheet,
          cursor: pageParam,
        })}`,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const problems = query.data?.pages.flatMap((page) => page.items) ?? [];
  const hasFilters = Boolean(debouncedQ || difficulty || topic || platform || sheet);

  function clearFilters() {
    setQ("");
    setDifficulty("");
    setTopic("");
    setPlatform("");
    setSort("newest");
    setSheet("");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Practice</h1>
        <p className="mt-1 text-sm text-muted">
          Search and filter every published problem by topic, difficulty, pattern, or platform.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-2">
            <Search className="size-4 shrink-0 text-muted" aria-hidden />
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title, tag, or pattern…"
              aria-label="Search problems"
              className="flex-1"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">Difficulty</span>
            {DIFFICULTIES.map((option) => {
              const active = difficulty === option.value;
              return (
                <button
                  key={option.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDifficulty(option.value)}
                  className={
                    active
                      ? "rounded-full border border-border-strong bg-foreground px-3 py-1 text-xs font-medium text-background"
                      : "rounded-full border border-border px-3 py-1 text-xs font-medium text-secondary transition-colors duration-150 hover:text-foreground"
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select
              label="Topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={topicsQuery.isLoading}
            >
              <option value="">All topics</option>
              {(topicsQuery.data?.topics ?? []).map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name} ({t._count.problems})
                </option>
              ))}
            </Select>

            <Select
              label="Platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as "" | Platform)}
            >
              {PLATFORMS.map((p) => (
                <option key={p.label} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>

            <Select
              label="Sort by"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {query.isSuccess
                ? `${problems.length} problem${problems.length === 1 ? "" : "s"} shown`
                : "Loading problems…"}
            </p>
            <div className="flex items-center gap-2">
              {sheet ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-hover dark:text-accent">
                  Sheet: {sheet}
                  <button
                    type="button"
                    onClick={() => setSheet("")}
                    aria-label="Clear sheet filter"
                    className="rounded-full hover:text-foreground"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </span>
              ) : null}
              {hasFilters ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {query.isLoading ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <Skeleton />
            <Skeleton />
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </CardContent>
        </Card>
      ) : query.isError ? (
        <ErrorState
          title="Couldn't load problems"
          message={getErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : problems.length === 0 ? (
        <EmptyState
          title="No problems match your filters"
          description="Try a different search term, or clear the filters to see everything."
          action={
            hasFilters ? (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-0">
              <ul>
                {problems.map((problem) => (
                  <ProblemRow
                    key={problem.id}
                    problem={problem}
                    href={`/app/problems/${problem.id}`}
                  />
                ))}
              </ul>
            </CardContent>
          </Card>

          {query.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                loading={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
              >
                Load more problems
              </Button>
            </div>
          ) : (
            <p className="text-center text-xs text-muted">You have reached the end of the list.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      }
    >
      <PracticeExplorer />
    </Suspense>
  );
}
