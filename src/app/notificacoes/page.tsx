import Link from "next/link";
import type { Metadata } from "next";

import { NotificationList } from "@/components/notifications/notification-list";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSeoMetadata } from "@/lib/seo";
import { qNotifications, qUnreadNotificationCount } from "@/lib/supabase/queries";
import { getSupabaseServerUser } from "@/lib/supabase/auth-server";

export const metadata: Metadata = createSeoMetadata({
  title: "Notificações",
  description: "Veja interações importantes dos seus projetos no Projeto Garagem.",
  path: "/notificacoes",
  canonicalPath: "/notificacoes",
});

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getSupabaseServerUser();

  const [notificationsResult, unreadResult] = user
    ? await Promise.all([qNotifications(40), qUnreadNotificationCount()])
    : [{ data: [], error: null }, { data: 0, error: null }];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mobile-page-shell mx-auto w-full max-w-4xl pb-12 md:pt-24">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs text-muted">Central social</p>
              <h1 className="mt-1 font-title text-2xl tracking-tight md:mt-2 md:text-5xl">
                Notificações
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted md:mt-3 md:text-base">
                Comentários, curtidas, salvos, seguidores e evoluções dos projetos que você acompanha.
              </p>
            </div>
            <Card className="self-start px-3 py-2 text-xs text-muted md:px-4 md:py-3 md:text-sm">
              {(unreadResult.data ?? 0).toLocaleString("pt-BR")} não lidas
            </Card>
          </div>

          <div className="mt-5 md:mt-8">
            {!user ? (
              <Card className="p-4 md:p-8">
                <h2 className="font-title text-2xl tracking-tight">Entre para ver notificações</h2>
                <p className="mt-2 text-sm text-muted">
                  A central de notificações fica ligada ao seu perfil.
                </p>
                <Button asChild className="mt-6">
                  <Link href="/login?next=/notificacoes">Entrar</Link>
                </Button>
              </Card>
            ) : (
              <NotificationList notifications={notificationsResult.data ?? []} />
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
