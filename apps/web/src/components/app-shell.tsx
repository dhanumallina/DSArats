"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Home,
  Layers,
  LayoutDashboard,
  LogOut,
  NotebookPen,
  RotateCcw,
  Settings,
  Target,
  Users,
} from "lucide-react";
import type { PublicUser } from "@dsarats/shared";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/components/toast";

const NAV_GROUPS = [
  {
    label: "Learn",
    items: [
      { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/app/sheets", label: "DSA Sheets", icon: Layers },
      { href: "/app/learning", label: "My Learning", icon: BookOpen },
      { href: "/app/practice", label: "Practice", icon: Target },
    ],
  },
  {
    label: "Track",
    items: [
      { href: "/app/daily-challenge", label: "Daily Challenge", icon: CalendarDays },
      { href: "/app/revision", label: "Revision", icon: RotateCcw },
      { href: "/app/progress", label: "Progress", icon: BarChart3 },
    ],
  },
  {
    label: "Grow",
    items: [
      { href: "/app/analytics", label: "Analytics", icon: NotebookPen },
      { href: "/app/community", label: "Community", icon: Users },
      { href: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

function SidebarNav({ user }: { user: PublicUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  async function handleLogout() {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
    queryClient.clear();
    toast("Logged out. See you tomorrow!", "info");
    router.replace("/");
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          DSA<span className="text-accent">Rats</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="App">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-1.5 px-3 text-xs font-medium uppercase tracking-wider text-muted">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150",
                        active
                          ? "bg-accent/10 font-medium text-accent-hover dark:text-accent"
                          : "text-secondary hover:bg-surface-secondary hover:text-foreground",
                      )}
                    >
                      <item.icon className="size-4 shrink-0" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-surface-secondary px-3 py-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/20 font-display text-sm font-bold text-accent-hover dark:text-accent">
            {(user.profile?.displayName ?? user.profile?.username ?? user.email)[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {user.profile?.displayName ?? user.profile?.username}
            </p>
            <p className="truncate text-xs text-muted">@{user.profile?.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-secondary transition-colors duration-150 hover:text-foreground"
          >
            <LogOut className="size-4" aria-hidden />
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleLogout() {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
    queryClient.clear();
    router.replace("/");
  }

  const tabs = [
    { href: "/app/dashboard", label: "Home", icon: Home },
    { href: "/app/sheets", label: "Sheets", icon: Layers },
    { href: "/app/practice", label: "Practice", icon: Target },
    { href: "/app/revision", label: "Revision", icon: RotateCcw },
    { href: "/app/settings", label: "More", icon: Settings },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4 md:hidden">
        <Link href="/app/dashboard" className="font-display text-base font-bold tracking-tight">
          DSA<span className="text-accent">Rats</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            className="flex size-9 items-center justify-center rounded-md border border-border text-secondary"
          >
            <LogOut className="size-4" aria-hidden />
          </button>
        </div>
      </header>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch justify-around border-t border-border bg-surface md:hidden"
        aria-label="Mobile app"
      >
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors duration-150",
                active ? "text-accent-hover dark:text-accent" : "text-muted",
              )}
            >
              <tab.icon className="size-5" aria-hidden />
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <div className="h-16 md:hidden" aria-hidden />
    </>
  );
}

export function AppShell({ user, children }: { user: PublicUser; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <SidebarNav user={user} />
      <div className="flex min-h-dvh flex-col md:pl-64">
        <MobileNav />
        <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}