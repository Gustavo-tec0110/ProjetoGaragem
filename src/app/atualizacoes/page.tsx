import Link from "next/link";
import type { Metadata } from "next";
import { Calendar, Flame, Plus, Wrench } from "lucide-react";

import { ProjectImage } from "@/components/projects/project-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSeoMetadata } from "@/lib/seo";
import { buildProjectHref, formatProjectDate } from "@/lib/projects/utils";
import { qExploreCars } from "@/lib/supabase/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { CarBuildUpdateRow, CarRow, ProfileRow } from "@/lib/types";

export const metadata: Metadata = createSeoMetadata({
  title: "Atualizações",
  description: "Acompanhe projetos novos, evoluções recentes e garagens em movimento no Projeto Garagem.",
  path: "/atualizacoes",
  canonicalPath: "/atualizacoes",
});

const CATEGORY_LABELS: Record<string, string> = {
  manutencao: "Manutenção",
  estetica: "Estética",
  performance: "Performance",
  interior: "Interior",
  suspensao: "Suspensão",
  rodas: "Rodas",
  motor: "Motor",
  eletrica: "Elétrica",
  compra: "Compra",
  antes_depois: "Antes e depois",
  outro: "Outro",
};

async function getRecentUpdates() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data: updates } = await supabase
    .from("car_build_updates")
    .select("*")
    .order("happened_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(12);

  const updateRows = (updates ?? []) as CarBuildUpdateRow[];
  const carIds = Array.from(new Set(updateRows.map((update) => update.car_id)));
  if (!carIds.length) return [];

  const { data: cars } = await supabase
    .from("cars")
    .select("*")
    .in("id", carIds)
    .eq("is_public", true);

  const carMap = new Map((cars ?? []).map((car) => [(car as CarRow).id, car as CarRow]));
  const ownerIds = Array.from(new Set((cars ?? []).map((car) => (car as CarRow).owner_id)));
  const { data: profiles } = ownerIds.length
    ? await supabase
        .from("public_profiles")
        .select("id, display_name, username")
        .in("id", ownerIds)
    : { data: [] };
  const profileMap = new Map(
    ((profiles ?? []) as Array<Pick<ProfileRow, "id" | "display_name" | "username">>).map((profile) => [
      profile.id,
      profile,
    ])
  );

  return updateRows
    .map((update) => {
      const car = carMap.get(update.car_id);
      if (!car) return null;
      return { update, car, owner: profileMap.get(car.owner_id) ?? null };
    })
    .filter((item): item is { update: CarBuildUpdateRow; car: CarRow; owner: Pick<ProfileRow, "id" | "display_name" | "username"> | null } => Boolean(item));
}

export default async function UpdatesPage() {
  const [recentProjectsResult, popularProjectsResult, recentUpdates] = await Promise.all([
    qExploreCars({ sort: "recent", limit: 6 }, { personalize: false }),
    qExploreCars({ sort: "likes", limit: 6 }, { personalize: false }),
    getRecentUpdates(),
  ]);
  const recentProjects = recentProjectsResult.data ?? [];
  const popularProjects = popularProjectsResult.data ?? [];
  const hasActivity = recentProjects.length || popularProjects.length || recentUpdates.length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 px-4 sm:px-6">
        <div className="mobile-page-shell mx-auto w-full max-w-6xl pb-12 md:pt-24">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs text-muted">Feed real</p>
              <h1 className="mt-2 font-title text-3xl tracking-tight md:text-5xl">
                Atualizações da garagem
              </h1>
              <p className="mt-3 max-w-3xl text-muted">
                Projetos recém-criados, evoluções de timeline e garagens que estão ganhando tração.
              </p>
            </div>
            <Button asChild>
              <Link href="/criar-projeto">
                <Plus className="size-4" />
                Criar projeto
              </Link>
            </Button>
          </div>

          {!hasActivity ? (
            <Card className="mt-8 p-6 md:p-8">
              <Wrench className="size-8 text-accent" />
              <h2 className="mt-4 font-title text-2xl tracking-tight">
                Ainda não há atividade real suficiente.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                Quando os primeiros projetos forem publicados e atualizados, este feed passa a mostrar o movimento real da comunidade.
              </p>
              <Button asChild className="mt-6">
                <Link href="/criar-projeto">Publicar primeiro projeto</Link>
              </Button>
            </Card>
          ) : (
            <div className="mt-8 grid gap-8">
              <section>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted">Timeline</p>
                    <h2 className="mt-1 font-title text-2xl tracking-tight">Evoluções recentes</h2>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {recentUpdates.length ? (
                    recentUpdates.map(({ update, car, owner }) => (
                      <Card key={update.id} className="overflow-hidden">
                        <div className="grid gap-0 sm:grid-cols-[10rem_1fr]">
                          <div className="relative min-h-44 bg-surface">
                            <ProjectImage
                              src={update.photo_urls[0] || update.photo_url || car.main_photo_url}
                              alt={`Atualização ${update.title}`}
                              fill
                              className="object-cover"
                              sizes="(min-width: 768px) 180px, 100vw"
                            />
                          </div>
                          <div className="p-4">
                            <div className="flex flex-wrap gap-2">
                              <Badge>{CATEGORY_LABELS[update.category] ?? update.category}</Badge>
                              <Badge variant="secondary">
                                <Calendar className="size-3" />
                                {formatProjectDate(update.happened_at)}
                              </Badge>
                            </div>
                            <h3 className="mt-3 font-title text-xl tracking-tight">{update.title}</h3>
                            <p className="mt-2 text-sm text-muted">
                              {car.name} adicionou uma nova atualização
                            </p>
                            <p className="mt-1 text-xs text-muted">
                              Por {owner?.display_name ?? "Membro Projeto Garagem"} - {car.brand} {car.model}
                            </p>
                            <Button asChild variant="outline" size="sm" className="mt-4">
                              <Link href={buildProjectHref(car.slug)}>Abrir projeto</Link>
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <Card className="p-5 text-sm text-muted">
                      Nenhuma atualização de timeline publicada ainda.
                    </Card>
                  )}
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-2">
                <Card className="p-5">
                  <div className="flex items-center gap-3">
                    <Wrench className="size-5 text-accent" />
                    <h2 className="font-title text-2xl tracking-tight">Projetos novos</h2>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {recentProjects.map((project) => (
                      <Link
                        key={project.id}
                        href={buildProjectHref(project.slug)}
                        className="rounded-3xl border border-border/70 bg-background/25 p-4 transition hover:bg-background/45"
                      >
                        <p className="font-ui text-sm font-semibold">{project.name}</p>
                        <p className="mt-1 text-xs text-muted">
                          {project.brand} {project.model} - {project.year}
                        </p>
                      </Link>
                    ))}
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="flex items-center gap-3">
                    <Flame className="size-5 text-accent" />
                    <h2 className="font-title text-2xl tracking-tight">Ganhando tração</h2>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {popularProjects.map((project) => (
                      <Link
                        key={project.id}
                        href={buildProjectHref(project.slug)}
                        className="rounded-3xl border border-border/70 bg-background/25 p-4 transition hover:bg-background/45"
                      >
                        <p className="font-ui text-sm font-semibold">{project.name}</p>
                        <p className="mt-1 text-xs text-muted">
                          {project.likes_count.toLocaleString("pt-BR")} curtidas - {project.views_count.toLocaleString("pt-BR")} views
                        </p>
                      </Link>
                    ))}
                  </div>
                </Card>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
