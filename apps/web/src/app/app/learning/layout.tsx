import type { Metadata } from "next";

// The page is a client component, so the title lives here.
export const metadata: Metadata = { title: "My Learning" };

export default function LearningLayout({ children }: { children: React.ReactNode }) {
  return children;
}
