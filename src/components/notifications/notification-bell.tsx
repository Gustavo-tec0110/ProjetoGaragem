"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";

export function NotificationBell({ userId }: { userId: string | null }) {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!userId) {
      return;
    }

    let mounted = true;

    function refreshCount() {
      void fetch("/api/notifications/unread-count", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : { count: 0 }))
        .then((data: { count?: number }) => {
          if (mounted) setCount(data.count ?? 0);
        })
        .catch(() => {
          if (mounted) setCount(0);
        });
    }

    refreshCount();
    const interval = window.setInterval(refreshCount, 30000);
    window.addEventListener("focus", refreshCount);
    window.addEventListener("notifications:read", refreshCount);
    document.addEventListener("visibilitychange", refreshCount);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshCount);
      window.removeEventListener("notifications:read", refreshCount);
      document.removeEventListener("visibilitychange", refreshCount);
    };
  }, [userId]);

  if (!userId) return null;

  return (
    <Button asChild variant="outline" size="icon" className="relative size-10" aria-label="Notificações">
      <Link href="/notificacoes">
        <Bell className="size-4" />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
