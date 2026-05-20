"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { LogOut, Shield } from "lucide-react";

import { SavedBuildsGrid } from "@/components/build/saved-builds-grid";
import { Button } from "@/components/ui/button";
import { PremiumCard } from "@/components/ui/premium-card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/supabase/use-user";

export function MeProfile() {
  const { user, loading, configured } = useSupabaseUser();
  const [busy, setBusy] = React.useState(false);

  if (!configured) {
    return (
      <div className="space-y-6">
        <div className="rounded-4xl border border-warning/30 bg-warning/10 p-5 text-sm text-muted">
          Perfil e Login Google estÃ£o em modo demo. Configure Supabase em <span className="text-foreground font-semibold">.env.local</span>{" "}
          para autenticaÃ§Ã£o real.
        </div>
        <SavedBuildsGrid />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-4xl" />
        <Skeleton className="h-24 rounded-4xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <PremiumCard className="relative overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/ref/hero-car.jpg"
              alt=""
              fill
              priority
              className="object-cover object-right opacity-40 blur-[2px] scale-[1.06]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/70 to-black/35" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/40 to-black/30" />
            <div className="absolute inset-0 pointer-events-none pg-scanlines opacity-16" />
            <div className="absolute inset-0 pointer-events-none pg-particles opacity-40" />
          </div>

          <div className="relative p-6 md:p-8">
            <p className="text-xs text-muted">Seu perfil</p>
            <h1 className="mt-2 font-title text-3xl md:text-4xl tracking-tight">Entre para salvar</h1>
            <p className="mt-2 text-muted max-w-2xl">
              Login Google libera perfil, builds salvas e compartilhamento.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-2">
              <Button asChild className="sm:flex-1">
                <Link href="/login">Ir para login</Link>
              </Button>
              <Button asChild variant="outline" className="sm:flex-1">
                <Link href="/montar">Continuar sem login</Link>
              </Button>
            </div>
          </div>
        </PremiumCard>

        <SavedBuildsGrid />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PremiumCard className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/ref/hero-car.jpg"
            alt=""
            fill
            priority
            className="object-cover object-right opacity-40 blur-[2px] scale-[1.06]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/70 to-black/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/40 to-black/30" />
          <div className="absolute inset-0 pointer-events-none pg-scanlines opacity-16" />
          <div className="absolute inset-0 pointer-events-none pg-particles opacity-40" />
        </div>

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="min-w-0">
              <p className="text-xs text-muted">Perfil autenticado</p>
              <h1 className="mt-2 font-title text-3xl md:text-4xl tracking-tight truncate">
                {user.user_metadata?.full_name ?? user.email ?? "UsuÃ¡rio"}
              </h1>
              <p className="mt-2 text-muted max-w-2xl">
                {user.email ?? "—"} â€¢ <span className="inline-flex items-center gap-2"><Shield className="size-4 text-accent" /> SessÃ£o ativa</span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button asChild variant="outline">
                <Link href="/montar">Montar build</Link>
              </Button>
              <Button
                variant="danger"
                disabled={busy}
                onClick={async () => {
                  if (!supabase) return;
                  setBusy(true);
                  await supabase.auth.signOut();
                  setBusy(false);
                }}
              >
                <LogOut className="size-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </PremiumCard>

      <div>
        <p className="text-xs text-muted">Sua garagem</p>
        <h2 className="mt-2 font-title text-2xl md:text-3xl tracking-tight">Builds salvas</h2>
        <p className="mt-2 text-muted max-w-2xl">
          Hoje estÃ¡ local (demo). PrÃ³ximo passo: salvar no banco + pÃ¡gina pÃºblica real por ID.
        </p>
        <div className="mt-6">
          <SavedBuildsGrid />
        </div>
      </div>
    </div>
  );
}

