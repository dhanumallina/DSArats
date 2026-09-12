import { EmptyState } from "@/components/ui/empty-state";

interface ComingSoonProps {
  title: string;
  description: string;
  phase: string;
  action?: React.ReactNode;
}

/** Honest placeholder for routes that arrive in later phases — no fake functionality. */
export function ComingSoon({ title, description, phase, action }: ComingSoonProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted">{phase}</p>
      </div>
      <EmptyState as="h2" title="Coming soon" description={description} action={action} />
    </div>
  );
}