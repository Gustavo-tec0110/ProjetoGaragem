import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ProjectTimeline } from "@/components/projects/project-timeline";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { mapCarDetailsToProject } from "@/lib/projects/mappers";
import { buildProjectHref, formatProjectCurrency, formatProjectDate } from "@/lib/projects/utils";
import { createSeoMetadata } from "@/lib/seo";
import { qCarBySlug } from "@/lib/supabase/queries";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await qCarBySlug(slug);
  const car = result.data;

  return createSeoMetadata({
    title: car ? `Evolução de ${car.name}` : "Evolução não encontrada",
    description: car
      ? `Histórico de evolução do projeto ${car.name} no Projeto Garagem.`
      : "Histórico de evolução do projeto não encontrado.",
    path: `/projeto/${slug}/evolucao`,
    canonicalPath: `/projeto/${slug}/evolucao`,
  });
}

export default async function ProjectEvolutionPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await qCarBySlug(slug);
  if (!result.data) notFound();

  const project = mapCarDetailsToProject(result.data);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl pt-20 pb-12 md:pt-24">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs text-muted">Histórico complementar</p>
              <h1 className="mt-2 font-title text-3xl tracking-tight md:text-5xl">
                Evolução de {project.title}
              </h1>
              <p className="mt-3 max-w-3xl text-muted">
                O perfil principal mostra como o carro está hoje. Esta área guarda como ele chegou até aqui.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href={buildProjectHref(project.slug)}>Voltar para visão geral</Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <p className="text-xs text-muted">Atualizações</p>
              <p className="mt-1 font-title text-2xl">{project.updates.length}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-muted">Última evolução</p>
              <p className="mt-1 font-ui text-sm font-semibold">
                {formatProjectDate(project.lastUpdateAt)}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-muted">Gasto registrado</p>
              <p className="mt-1 font-ui text-sm font-semibold">
                {formatProjectCurrency(project.totalInvested ?? project.estimatedCost)}
              </p>
            </Card>
          </div>

          <section className="mt-10">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs text-muted">Evolução</p>
                <h2 className="mt-1 font-title text-2xl tracking-tight">Atualizações do projeto</h2>
              </div>
              <Badge>{project.updates.length} registros</Badge>
            </div>
            <div className="mt-5">
              <ProjectTimeline project={project} />
            </div>
          </section>

          <section className="mt-10">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs text-muted">Histórico técnico</p>
                <h2 className="mt-1 font-title text-2xl tracking-tight">Peças removidas</h2>
              </div>
              <Badge>{project.removedParts.length} itens</Badge>
            </div>
            <div className="mt-5 grid gap-3">
              {project.removedParts.length ? (
                project.removedParts.map((part) => (
                  <Card key={part.id} className="p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs text-muted">{part.category}</p>
                        <h3 className="mt-1 font-title text-lg tracking-tight">{part.name}</h3>
                        {part.description ? (
                          <p className="mt-1 text-sm text-muted">{part.description}</p>
                        ) : null}
                      </div>
                      <Badge variant="secondary">Removida</Badge>
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="p-5 text-sm text-muted">
                  Nenhuma peça removida foi registrada neste projeto.
                </Card>
              )}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
