import Link from "next/link";

import { CarGrid } from "@/components/garage/car-card";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Button } from "@/components/ui/button";
import { qRankingCars } from "@/lib/supabase/queries";

export const metadata = {
  title: "Rankings",
};

export default async function RankingsPage() {
  const result = await qRankingCars();
  const rankings = result.data;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl pt-20 md:pt-24 pb-12">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs text-muted">Rankings MVP</p>
              <h1 className="mt-2 font-title text-3xl tracking-tight md:text-5xl">
                Projetos em destaque
              </h1>
              <p className="mt-3 max-w-2xl text-muted">
                Rankings simples, mensuraveis e baseados em dados reais.
              </p>
            </div>
            <Button asChild>
              <Link href="/carros/novo">Adicionar meu carro</Link>
            </Button>
          </div>

          {result.error ? (
            <div className="mt-8 rounded-4xl border border-danger/30 bg-danger/10 p-5 text-sm text-danger">
              Erro ao carregar rankings: {result.error}
            </div>
          ) : null}

          <section className="mt-10">
            <h2 className="font-title text-2xl tracking-tight">Mais curtidos</h2>
            <div className="mt-4">
              <CarGrid cars={rankings?.mostLiked ?? []} emptyTitle="Ainda nao ha curtidas suficientes." />
            </div>
          </section>

          <section className="mt-12">
            <h2 className="font-title text-2xl tracking-tight">Mais salvos</h2>
            <div className="mt-4">
              <CarGrid cars={rankings?.mostSaved ?? []} emptyTitle="Ainda nao ha carros salvos suficientes." />
            </div>
          </section>

          <section className="mt-12">
            <h2 className="font-title text-2xl tracking-tight">Mais recentes</h2>
            <div className="mt-4">
              <CarGrid cars={rankings?.newest ?? []} emptyTitle="Nenhum projeto cadastrado ainda." />
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
