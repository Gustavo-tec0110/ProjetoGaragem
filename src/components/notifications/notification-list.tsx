"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Circle } from "lucide-react";

import { markNotificationReadAction, markNotificationsReadAction } from "@/app/carros/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { NotificationWithContext } from "@/lib/supabase/queries";
import { buildProjectHref, formatProjectDate } from "@/lib/projects/utils";

export function NotificationList({
  notifications,
}: {
  notifications: NotificationWithContext[];
}) {
  const [items, setItems] = React.useState(notifications);
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const unreadIdsRef = React.useRef<Set<string>>(new Set());
  const listMountedRef = React.useRef(false);

  React.useEffect(() => {
    unreadIdsRef.current = new Set(items.filter((item) => !item.read_at).map((item) => item.id));
  }, [items]);

  React.useEffect(() => {
    listMountedRef.current = true;
    return () => {
      listMountedRef.current = false;
      // Strict Mode reconnects effects immediately while the list is still open.
      queueMicrotask(() => {
        if (listMountedRef.current) return;

        const ids = Array.from(unreadIdsRef.current);
        if (!ids.length) return;

        unreadIdsRef.current.clear();
        void markNotificationsReadAction(ids).then((result) => {
          if (result.ok) {
            window.dispatchEvent(new Event("notifications:read"));
          }
        }).catch(() => undefined);
      });
    };
  }, []);

  function markAsRead(notificationId: string) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await markNotificationReadAction(notificationId);
        if (result.ok) {
          unreadIdsRef.current.delete(notificationId);
          setItems((current) =>
            current.map((item) =>
              item.id === notificationId
                ? { ...item, read_at: new Date().toISOString() }
                : item
            )
          );
          window.dispatchEvent(new Event("notifications:read"));
        } else {
          setError("Não foi possível marcar a notificação como lida. Tente novamente.");
        }
      } catch {
        setError("Não foi possível marcar a notificação como lida. Tente novamente.");
      }
    });
  }

  if (!items.length) {
    return (
      <Card className="p-4 text-sm text-muted md:p-6">
        Nenhuma notificação por enquanto. Quando alguém interagir com seus projetos, ela aparece aqui.
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {error ? <p role="alert" className="text-sm text-muted">{error}</p> : null}
      {items.map((notification) => {
        const href = notification.car ? buildProjectHref(notification.car.slug) : "/garagem";
        const unread = !notification.read_at;

        return (
          <Card key={notification.id} className="p-3 md:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:gap-4">
              <Link href={href} className="min-w-0 flex-1" onClick={() => unread && markAsRead(notification.id)}>
                <div className="flex items-start gap-3">
                  <span className="mt-1 text-red-400">
                    {unread ? <Circle className="size-3 fill-current" /> : <Check className="size-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-title text-base tracking-tight md:text-lg">
                      {notification.title}
                    </span>
                    {notification.body ? (
                      <span className="mt-1 block text-xs text-muted md:text-sm">{notification.body}</span>
                    ) : null}
                    <span className="mt-2 block text-xs text-muted">
                      {notification.actor?.display_name ?? "Projeto Garagem"} -{" "}
                      {formatProjectDate(notification.created_at)}
                    </span>
                  </span>
                </div>
              </Link>

              {unread ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={isPending}
                  onClick={() => markAsRead(notification.id)}
                >
                  Marcar lida
                </Button>
              ) : null}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
