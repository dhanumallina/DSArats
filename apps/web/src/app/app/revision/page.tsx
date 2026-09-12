import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata = { title: "Revision" };

export default function RevisionPage() {
  return (
    <ComingSoon
      title="Revision"
      phase="Arrives in Phase 5"
      description="Spaced repetition at 1 → 3 → 7 → 14 → 30 days. DSARats tells you exactly what to revise today."
    />
  );
}