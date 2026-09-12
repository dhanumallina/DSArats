import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "accent" | "success" | "error";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-surface-secondary text-secondary border-border",
  accent: "bg-accent/10 text-accent-hover dark:text-accent border-accent/30",
  success: "bg-success/10 text-success border-success/30",
  error: "bg-error/10 text-error border-error/30",
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}