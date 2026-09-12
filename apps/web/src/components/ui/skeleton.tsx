import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
}

export function Skeleton({ className, lines, ...props }: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <div className={cn("flex w-full flex-col gap-2", className)} aria-busy="true" aria-live="polite">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-4 w-full animate-pulse rounded bg-surface-secondary"
            style={{ width: `${100 - i * 12}%` }}
          />
        ))}
      </div>
    );
  }
  return <div className={cn("h-4 w-full animate-pulse rounded bg-surface-secondary", className)} {...props} />;
}