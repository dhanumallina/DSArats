import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata = { title: "Contests" };

/**
 * Contests are approval-gated in the plan, and there is no contest engine behind this page.
 * It is a capability teaser only: no dates, entrants, or standings are shown, because
 * inventing any of those would be exactly the fake-stats failure the product rules out.
 */
export default function ContestsPage() {
  return (
    <ComingSoon
      title="Contests"
      phase="Not open yet"
      description="Timed contests with real submissions need a secure execution architecture before they can be honest. Until that exists, this stays a preview — no placeholder brackets, no invented standings."
    />
  );
}
