"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function NotificationBell({ userId }: { userId: string | null }) {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!userId) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let mounted = true;

    void supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null)
      .then(({ count: unread }) => {
        if (mounted) setCount(unread ?? 0);
      });

    return () => {
      mounted = false;
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
