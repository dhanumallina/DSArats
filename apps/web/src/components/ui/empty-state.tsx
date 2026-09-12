import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** Heading level for the title (defaults to h2). */
  as?: "h1" | "h2" | "h3";
}

export function EmptyState({ title, description, action, className, as = "h2" }: EmptyStateProps) {
  const Heading = as;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
    >
      <Heading className="font-display text-base font-semibold text-foreground">{title}</Heading>
      {description && <p className="max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}