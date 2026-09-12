import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata = { title: "Daily Challenge" };

export default function DailyChallengePage() {
  return (
    <ComingSoon
      title="Daily Challenge"
      phase="Arrives in Phase 4"
      description="One recommended problem every day, chosen from your weak topics and revision history."
    />
  );
}