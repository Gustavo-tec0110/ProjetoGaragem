"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Circle } from "lucide-react";

import { markNotificationReadAction } from "@/app/carros/actions";
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

  function markAsRead(notificationId: string) {
    startTransition(async () => {
      const result = await markNotificationReadAction(notificationId);
      if (result.ok) {
        setItems((current) =>
          current.map((item) =>
            item.id === notificationId
              ? { ...item, read_at: new Date().toISOString() }
              : item
          )
        );
      }
    });
  }

  if (!items.length) {
    return (
      <Card className="p-6 text-sm text-muted">
        Nenhuma notificação por enquanto. Quando alguém interagir com seus projetos, ela aparece aqui.
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((notification) => {
        const href = notification.car ? buildProjectHref(notification.car.slug) : "/garagem";
        const unread = !notification.read_at;

        return (
          <Card key={notification.id} className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Link href={href} className="min-w-0 flex-1" onClick={() => unread && markAsRead(notification.id)}>
                <div className="flex items-start gap-3">
                  <span className="mt-1 text-red-400">
                    {unread ? <Circle className="size-3 fill-current" /> : <Check className="size-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-title text-lg tracking-tight">
                      {notification.title}
                    </span>
                    {notification.body ? (
                      <span className="mt-1 block text-sm text-muted">{notification.body}</span>
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
