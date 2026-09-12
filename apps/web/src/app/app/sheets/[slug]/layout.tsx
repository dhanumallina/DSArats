import type { Metadata } from "next";

// The page is a client component, so the title lives here.
export const metadata: Metadata = { title: "Sheet" };

export default function SheetDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
