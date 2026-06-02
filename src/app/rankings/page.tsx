import Link from "next/link";

import { ProjectGrid } from "@/components/projects/project-grid";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Button } from "@/components/ui/button";
import { getProjectRankings } from "@/lib/projects/server";

export const metadata = {
  title: "Rankings",
};

export default async function RankingsPage() {
  const rankings = await getProjectRankings(9);

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

          {rankings.notice ? (
            <div className="mt-8 rounded-4xl border border-warning/30 bg-warning/10 p-5 text-sm text-muted">
              {rankings.notice}
            </div>
          ) : null}

          <section className="mt-10">
            <h2 className="font-title text-2xl tracking-tight">Em alta</h2>
            <div className="mt-4">
              <ProjectGrid
                projects={rankings.trending}
                emptyTitle="Ainda nao ha projetos em alta."
              />
            </div>
          </section>

          <section className="mt-12">
            <h2 className="font-title text-2xl tracking-tight">Mais curtidos</h2>
            <div className="mt-4">
              <ProjectGrid
                projects={rankings.mostLiked}
                emptyTitle="Ainda nao ha curtidas suficientes."
              />
            </div>
          </section>

          <section className="mt-12">
            <h2 className="font-title text-2xl tracking-tight">Mais vistos</h2>
            <div className="mt-4">
              <ProjectGrid
                projects={rankings.mostViewed}
                emptyTitle="Ainda nao ha visualizacoes suficientes."
              />
            </div>
          </section>

          <section className="mt-12">
            <h2 className="font-title text-2xl tracking-tight">Recentemente atualizados</h2>
            <div className="mt-4">
              <ProjectGrid
                projects={rankings.mostUpdated}
                emptyTitle="Ainda nao ha atualizacoes suficientes."
              />
            </div>
          </section>

          <section className="mt-12">
            <h2 className="font-title text-2xl tracking-tight">Mais recentes</h2>
            <div className="mt-4">
              <ProjectGrid
                projects={rankings.mostRecent}
                emptyTitle="Nenhum projeto cadastrado ainda."
              />
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
