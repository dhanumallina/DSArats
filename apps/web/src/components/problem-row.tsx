import Link from "next/link";
import { CheckCircle2, ExternalLink, Flag } from "lucide-react";
import type { Difficulty, ProblemStatus } from "@dsarats/shared";
import { DifficultyBadge } from "@/components/difficulty-badge";

export interface ProblemRowData {
  id: string;
  title: string;
  difficulty: Difficulty;
  pattern?: string | null;
  platformProblemUrl: string;
  estimatedMinutes?: number | null;
  isCore?: boolean;
  /** The authenticated viewer's status, or null/undefined when anonymous / untouched. */
  viewerStatus?: ProblemStatus | null;
}

/** A short, text-labelled status so meaning never depends on colour alone. */
function ViewerStatus({ status }: { status: ProblemStatus | null | undefined }) {
  if (!status || status === "NOT_STARTED") return null;

  if (status === "NEEDS_REVISION") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-error">
        <Flag className="size-3.5" aria-hidden />
        Revise
      </span>
    );
  }

  if (status === "ATTEMPTED") {
    return <span className="text-xs text-secondary">Attempted</span>;
  }

  const label = status === "MASTERED" ? "Mastered" : status === "REVISED" ? "Revised" : "Solved";
  return (
    <span className="inline-flex items-center gap-1 text-xs text-success">
      <CheckCircle2 className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

interface ProblemRowProps {
  problem: ProblemRowData;
  /** Internal destination (app-only). Omit on public pages to render a plain title. */
  href?: string;
  /** 1-based position shown at the row start. */
  index?: number;
}

export function ProblemRow({ problem, href, index }: ProblemRowProps) {
  return (
    <li className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
      {index !== undefined && (
        <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted">{index}</span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {href ? (
            <Link href={href} className="truncate text-sm font-medium text-foreground hover:text-link">
              {problem.title}
            </Link>
          ) : (
            <span className="truncate text-sm font-medium text-foreground">{problem.title}</span>
          )}
          <DifficultyBadge difficulty={problem.difficulty} />
          {problem.isCore && <span className="text-xs text-muted">core</span>}
          <ViewerStatus status={problem.viewerStatus} />
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
          {problem.pattern && <span>{problem.pattern}</span>}
          {problem.estimatedMinutes ? <span>~{problem.estimatedMinutes} min</span> : null}
        </div>
      </div>

      <a
        href={problem.platformProblemUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${problem.title} on its platform (opens in a new tab)`}
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-surface-secondary hover:text-foreground"
      >
        <ExternalLink className="size-4" aria-hidden />
      </a>
    </li>
  );
}
