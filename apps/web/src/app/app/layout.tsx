"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { useMe, isLoggedOut } from "@/hooks/use-me";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError, error, refetch } = useMe();
  const router = useRouter();
  const pathname = usePathname();

  const loggedOut = isLoggedOut(error);

  // Only redirect when the session is genuinely missing/expired. A transient
  // network error must NOT kick the user to /login.
  useEffect(() => {
    if (loggedOut) {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
    }
  }, [loggedOut, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh flex-col gap-6 p-6 md:ml-64">
        <Skeleton lines={2} className="max-w-md" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  if (isError && !loggedOut) {
    return (
      <div className="flex min-h-dvh flex-col justify-center p-6 md:ml-64">
        <ErrorState
          title="Couldn't load your dashboard"
          message="The server didn't respond. Check your connection and try again."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!data?.user) {
    return null;
  }

  return <AppShell user={data.user}>{children}</AppShell>;
}