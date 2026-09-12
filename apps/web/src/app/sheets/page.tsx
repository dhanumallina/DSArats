import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Layers } from "lucide-react";
import type { SheetSummary, SheetsListResponse } from "@dsarats/shared";
import { serverGet } from "@/lib/server-api";
import { PublicHeader } from "@/components/public-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

export const metadata: Metadata = {
  title: "DSA Sheets",
  description: "Browse curated DSA sheets on DSARats.",
};

// Rendered per request: the sheet catalog changes as content is published, and this
// keeps `next build` from requiring a running API.
export const dynamic = "force-dynamic";

const SHEET_DIFFICULTY_LABEL: Record<SheetSummary["difficulty"], string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

function Distribution({ sheet }: { sheet: SheetSummary }) {
  const items = [
    { label: "Easy", value: sheet.difficultyDistribution.EASY },
    { label: "Medium", value: sheet.difficultyDistribution.MEDIUM },
    { label: "Hard", value: sheet.difficultyDistribution.HARD },
  ].filter((item) => item.value > 0);

  if (items.length === 0) return null;

  return (
    <p className="text-xs text-muted">
      {items.map((item) => `${item.value} ${item.label}`).join(" · ")}
    </p>
  );
}

export default async function SheetsPage() {
  const result = await serverGet<SheetsListResponse>("/sheets");

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
        <div className="mb-10 max-w-2xl">
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">DSA Sheets</h1>
          <p className="mt-3 text-secondary">
            Structured problem sets with official links — curated by the community, tracked by
            DSARats.
          </p>
        </div>

        {!result.ok ? (
          result.status === 404 ? (
            <ErrorState title="Sheets unavailable" message="The sheet catalog could not be found." />
          ) : (
            <ErrorState
              title="Couldn't load sheets"
              message="The server didn't respond. Please try again in a moment."
            />
          )
        ) : result.data.sheets.length === 0 ? (
          <EmptyState
            title="No sheets published yet"
            description="Curated sheets will appear here as soon as they are published."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.data.sheets.map((sheet) => (
              <Card key={sheet.slug} interactive>
                <CardContent className="flex h-full flex-col gap-3 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-accent-hover dark:text-accent">
                      <Layers className="size-5" aria-hidden />
                    </div>
                    <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-secondary">
                      {SHEET_DIFFICULTY_LABEL[sheet.difficulty]}
                    </span>
                  </div>

                  <h2 className="font-display text-lg font-semibold">{sheet.name}</h2>
                  <p className="text-sm text-muted">{sheet.description}</p>

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

                  <Distribution sheet={sheet} />

                  <div className="mt-auto flex items-center gap-2 pt-3">
                    <Link href={`/sheets/${sheet.slug}`}>
                      <Button variant="secondary" size="sm">
                        View sheet
                      </Button>
                    </Link>
                    <Link href={`/signup?next=/app/sheets/${sheet.slug}`}>
                      <Button size="sm">Start</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
