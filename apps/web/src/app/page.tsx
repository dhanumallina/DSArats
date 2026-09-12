import Link from "next/link";
import { ArrowRight, GitBranch, Layers, Target } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link href="/" className="font-display text-lg font-bold tracking-tight">
            DSA<span className="text-accent">Rats</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-secondary md:flex" aria-label="Main">
            <Link href="/sheets" className="hover:text-foreground">
              DSA Sheets
            </Link>
            <Link href="/#how" className="hover:text-foreground">
              How It Works
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Start Learning</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main id="main-content" className="flex flex-1 flex-col">
        <section className="relative overflow-hidden">
          {/* Subtle DSA-inspired background — minimal connected nodes (CSS, no heavy 3D in foundation phase) */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -right-24 -top-24 size-96 rounded-full bg-accent/5 blur-2xl" />
            <div className="absolute -bottom-32 -left-24 size-96 rounded-full bg-accent/5 blur-2xl" />
          </div>

          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-6 pb-20 pt-20 md:pt-28">
            <div className="flex max-w-3xl flex-col items-center gap-6 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-secondary">
                <Target className="size-3.5 text-accent" aria-hidden />
                Structured DSA learning platform
              </span>
              <h1 className="font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl">
                Master DSA. Build Consistency.{" "}
                {/* accent gold fails AA contrast on cream — use the darker link gold */}
                <span className="text-link">Crack Interviews.</span>
              </h1>
              <p className="max-w-xl text-base text-secondary md:text-lg">
                A structured platform to learn data structures and algorithms, practice
                problems, and build confidence for coding interviews.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/signup">
                  <Button size="lg">
                    Start Your DSA Journey
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                </Link>
                <Link href="/sheets">
                  <Button size="lg" variant="secondary">
                    Explore DSA Sheets
                  </Button>
                </Link>
              </div>
            </div>

            {/* Roadmap preview strip — from the approved design */}
            <div className="mt-8 w-full max-w-3xl rounded-xl border border-border bg-surface p-6 shadow-card">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <GitBranch className="size-4 text-accent" aria-hidden />
                  DSA Roadmap
                </div>
                <span className="text-xs text-muted">9 stages</span>
              </div>
              <ol className="mt-4 flex flex-col gap-2 text-sm">
                {[
                  "DSA Foundations",
                  "Arrays & Strings",
                  "Searching & Sorting",
                  "Linked Lists",
                  "Stacks & Queues",
                  "Trees",
                  "Graphs",
                  "Dynamic Programming",
                  "Interview Ready",
                ].map((step, i) => (
                  <li key={step} className="flex items-center gap-3">
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        i === 8
                          ? "bg-accent text-background"
                          : "border border-border text-muted"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className={i === 8 ? "font-medium text-foreground" : "text-secondary"}>
                      {step}
                    </span>
                    {i < 8 && <span className="ml-auto hidden text-xs text-muted sm:inline">↓</span>}
                  </li>
                ))}
              </ol>
            </div>

            {/* Why DSARats — short strip */}
            <div
              id="how"
              className="mt-4 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3"
            >
              {[
                { icon: <Layers className="size-4" aria-hidden />, title: "Structured practice", text: "Curated sheets with ordered problems." },
                { icon: <Target className="size-4" aria-hidden />, title: "Smart revision", text: "Spaced repetition keeps topics fresh." },
                { icon: <GitBranch className="size-4" aria-hidden />, title: "Honest progress", text: "Analytics that show real weak spots." },
              ].map((f) => (
                <div key={f.title} className="rounded-xl border border-border bg-surface p-5 shadow-card">
                  <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-accent/10 text-accent-hover dark:text-accent">
                    {f.icon}
                  </div>
                  <p className="font-display text-sm font-semibold">{f.title}</p>
                  <p className="mt-1 text-sm text-muted">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-muted sm:flex-row">
          <p className="font-display font-semibold text-foreground">
            DSA<span className="text-accent">Rats</span>
          </p>
          <p>Master DSA. Build Consistency. Crack Interviews.</p>
        </div>
      </footer>
    </div>
  );
}