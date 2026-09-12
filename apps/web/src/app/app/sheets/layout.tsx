import type { Metadata } from "next";

// The page is a client component (start/continue mutations), so the title lives here.
export const metadata: Metadata = { title: "DSA Sheets" };

export default function SheetsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
