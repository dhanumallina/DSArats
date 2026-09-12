import type { Metadata } from "next";
import { CalendarDays, Flame, Layers, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ContinueLearning } from "./continue-learning";
import { DashboardGreeting } from "./dashboard-greeting";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <DashboardGreeting />

      {/* Stats — real numbers arrive with Phase 4 (streak, progress, activity) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: Flame, label: "Current streak", note: "Phase 4" },
          { icon: Layers, label: "Problems solved", note: "Phase 4" },
          { icon: CalendarDays, label: "Today's goal", note: "Phase 4" },
          { icon: RotateCcw, label: "Revision due", note: "Phase 5" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex flex-col gap-2 p-5">
              <stat.icon className="size-5 text-accent" aria-hidden />
              <div>
                <p className="font-display text-2xl font-bold text-muted">—</p>
                <p className="text-sm text-secondary">{stat.label}</p>
                <p className="text-xs text-muted">{stat.note}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today's Challenge — Phase 4 */}
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Challenge</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            as="h3"
            title="Daily challenges are coming"
            description="From Phase 4, DSARats will recommend a problem each day based on your weak topics and revision history."
          />
        </CardContent>
      </Card>

      {/* Continue Learning — real sheet progress */}
      <Card>
        <CardHeader>
          <CardTitle>Continue Learning</CardTitle>
        </CardHeader>
        <CardContent>
          <ContinueLearning />
        </CardContent>
      </Card>
    </div>
  );
}