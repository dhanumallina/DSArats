import type { Metadata } from "next";

// The page is a client component (filters + TanStack Query), so the title lives here.
export const metadata: Metadata = { title: "Practice" };

export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
