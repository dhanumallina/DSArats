import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import type { SheetDetailResponse } from "@dsarats/shared";
import { serverGet } from "@/lib/server-api";
import { PublicHeader } from "@/components/public-header";
import { ProblemRow } from "@/components/problem-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

export const dynamic = "force-dynamic";

const SHEET_DIFFICULTY_LABEL: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await serverGet<SheetDetailResponse>(`/sheets/${slug}`);
  return { title: result.ok ? result.data.sheet.name : "DSA Sheet" };
}

export default async function SheetDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await serverGet<SheetDetailResponse>(`/sheets/${slug}`);

  if (!result.ok && result.status === 404) notFound();

  const sheet = result.ok ? result.data.sheet : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <Link
          href="/sheets"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-secondary hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All sheets
        </Link>

        {!sheet ? (
          <ErrorState
            title="Couldn't load this sheet"
            message="The server didn't respond. Please try again in a moment."
          />
        ) : (
          <>
            <header className="mb-8">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-3xl font-bold tracking-tight">{sheet.name}</h1>
                <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-secondary">
                  {SHEET_DIFFICULTY_LABEL[sheet.difficulty] ?? sheet.difficulty}
                </span>
              </div>

              <p className="mt-3 max-w-2xl text-secondary">{sheet.description}</p>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-secondary">
                <span className="font-medium text-foreground">
                  {sheet.problemCount} problem{sheet.problemCount === 1 ? "" : "s"}
                </span>
                {sheet.estimatedHours ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-4" aria-hidden />~{sheet.estimatedHours} hours
                  </span>
                ) : null}
                <span>Easy {sheet.difficultyDistribution.EASY}</span>
                <span>Medium {sheet.difficultyDistribution.MEDIUM}</span>
                <span>Hard {sheet.difficultyDistribution.HARD}</span>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href={`/signup?next=/app/sheets/${sheet.slug}`}>
                  <Button>Start this sheet</Button>
                </Link>
                <Link href="/login">
                  <Button variant="secondary">I already have an account</Button>
                </Link>
              </div>

              {sheet.sourceAttribution ? (
                <p className="mt-4 text-xs text-muted">{sheet.sourceAttribution}</p>
              ) : null}
            </header>

            {sheet.topics.length === 0 ? (
              <EmptyState
                title="No problems in this sheet yet"
                description="Problems will appear here once they are added to the sheet."
              />
            ) : (
              <div className="flex flex-col gap-6">
                {sheet.topics.map((topic, topicIndex) => (
                  <section key={topic.id} aria-labelledby={`topic-${topic.id}`}>
                    <div className="mb-2 flex items-baseline justify-between">
                      <h2 id={`topic-${topic.id}`} className="font-display text-lg font-semibold">
                        <span className="mr-2 text-muted">{topicIndex + 1}.</span>
                        {topic.name}
                      </h2>
                      <span className="text-xs text-muted">
                        {topic.problemCount} problem{topic.problemCount === 1 ? "" : "s"}
                      </span>
                    </div>

                    <Card>
                      <CardContent className="p-0">
                        {topic.problems.length === 0 ? (
                          <p className="px-4 py-6 text-sm text-muted">
                            No problems assigned to this topic yet.
                          </p>
                        ) : (
                          <ul>
                            {topic.problems.map((problem, i) => (
                              <ProblemRow
                                key={problem.id}
                                problem={problem}
                                index={
                                  sheet.topics
                                    .slice(0, topicIndex)
                                    .reduce((sum, t) => sum + t.problems.length, 0) +
                                  i +
                                  1
                                }
                              />
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
