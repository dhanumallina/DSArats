import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

/** Shared header for public marketing/browse pages. */
export function PublicHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          DSA<span className="text-accent">Rats</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-secondary md:flex" aria-label="Main">
          <Link href="/sheets" className="hover:text-foreground">
            DSA Sheets
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Login
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Start Learning</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
