import Link from "next/link";
import type { Metadata } from "next";

import { ProjectImage } from "@/components/projects/project-image";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getProjectCollection, getProjectsBySlugs } from "@/lib/projects/server";
import { createSeoMetadata } from "@/lib/seo";
import { buildProjectHref, formatProjectCurrency, formatProjectDate } from "@/lib/projects/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function param(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function metricRows(projectA: Awaited<ReturnType<typeof getProjectsBySlugs>>[number] | null, projectB: Awaited<ReturnType<typeof getProjectsBySlugs>>[number] | null) {
  return [
    {
      label: "Potencia",
      left: projectA?.powerCv ? `${projectA.powerCv} cv` : "Nao informado",
      right: projectB?.powerCv ? `${projectB.powerCv} cv` : "Nao informado",
    },
    {
      label: "Torque",
      left: projectA?.torqueNm ? `${projectA.torqueNm} Nm` : "Nao informado",
      right: projectB?.torqueNm ? `${projectB.torqueNm} Nm` : "Nao informado",
    },
    {
      label: "Peso",
      left: projectA?.weightKg ? `${projectA.weightKg} kg` : "Nao informado",
      right: projectB?.weightKg ? `${projectB.weightKg} kg` : "Nao informado",
    },
    {
      label: "Ano",
      left: projectA?.year ?? "Nao informado",
      right: projectB?.year ?? "Nao informado",
    },
    {
      label: "Valor investido",
      left: formatProjectCurrency(projectA?.totalInvested ?? projectA?.estimatedCost),
      right: formatProjectCurrency(projectB?.totalInvested ?? projectB?.estimatedCost),
    },
    {
      label: "Numero de modificacoes",
      left: projectA?.modificationsCount ?? 0,
      right: projectB?.modificationsCount ?? 0,
    },
    {
      label: "Status",
      left: projectA?.status ?? "Nao informado",
      right: projectB?.status ?? "Nao informado",
    },
  ];
}

function ProjectCompareCard({
  project,
}: {
  project: Awaited<ReturnType<typeof getProjectsBySlugs>>[number] | null;
}) {
  if (!project) {
    return (
      <Card className="p-6 text-center text-sm text-muted">
        Selecione um projeto para preencher esta coluna da comparacao.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[4/3] bg-surface">
        <ProjectImage
          src={project.mainImage}
          alt={`Projeto ${project.title}`}
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 40vw, 100vw"
        />
      </div>
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{project.style}</Badge>
          <Badge>{project.status}</Badge>
          {project.tags[0] ? <Badge>{project.tags[0]}</Badge> : null}
        </div>
        <div>
          <h2 className="font-title text-2xl tracking-tight">{project.title}</h2>
          <p className="mt-1 text-sm text-muted">
            {project.carModel} - {project.year}
          </p>
          <p className="mt-3 text-sm text-foreground/85">{project.shortDescription}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-border/70 bg-background/25 p-4">
            <p className="text-xs text-muted">Atualizado em</p>
            <p className="mt-1 font-ui text-sm font-semibold">
              {formatProjectDate(project.lastUpdateAt)}
            </p>
          </div>
          <div className="rounded-3xl border border-border/70 bg-background/25 p-4">
            <p className="text-xs text-muted">Meta</p>
            <p className="mt-1 font-ui text-sm font-semibold">
              {project.projectGoal ?? "Nao informada"}
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={buildProjectHref(project.slug)}>Abrir projeto</Link>
        </Button>
      </div>
    </Card>
  );
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const left = param(params, "left");
  const right = param(params, "right");
  const selected = [left, right].filter(Boolean);

  return createSeoMetadata({
    title: selected.length ? `Comparar projetos: ${selected.join(" vs ")}` : "Comparar projetos",
    description:
      "Compare potencia, torque, peso, ano, valor investido, numero de modificacoes e status lado a lado.",
    path:
      selected.length
        ? `/comparar?${new URLSearchParams({ ...(left ? { left } : {}), ...(right ? { right } : {}) }).toString()}`
        : "/comparar",
    canonicalPath: "/comparar",
  });
}

export default async function CompararPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const left = param(params, "left");
  const right = param(params, "right");
  const [catalog, projects] = await Promise.all([
    getProjectCollection(),
    getProjectsBySlugs([left, right]),
  ]);

  const leftProject = projects.find((project) => project.slug === left) ?? null;
  const rightProject = projects.find((project) => project.slug === right) ?? null;
  const rows = metricRows(leftProject, rightProject);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl pt-20 pb-12 md:pt-24">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs text-muted">Comparacao</p>
              <h1 className="mt-2 font-title text-3xl tracking-tight md:text-5xl">
                Compare dois projetos lado a lado
              </h1>
              <p className="mt-3 max-w-3xl text-muted">
                Veja potencia, torque, peso, ano, investimento, modificacoes e status
                em um layout responsivo pensado para consulta rapida.
              </p>
            </div>
          </div>

          <Card className="mt-8 p-5">
            <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <select
                name="left"
                defaultValue={left}
                className="pg-control h-12 rounded-3xl px-4 text-sm"
              >
                <option value="">Selecione o projeto A</option>
                {catalog.allProjects.map((project) => (
                  <option key={project.slug} value={project.slug}>
                    {project.title}
                  </option>
                ))}
              </select>
              <select
                name="right"
                defaultValue={right}
                className="pg-control h-12 rounded-3xl px-4 text-sm"
              >
                <option value="">Selecione o projeto B</option>
                {catalog.allProjects.map((project) => (
                  <option key={project.slug} value={project.slug}>
                    {project.title}
                  </option>
                ))}
              </select>
              <Button type="submit">Comparar</Button>
            </form>
          </Card>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <ProjectCompareCard project={leftProject} />
            <ProjectCompareCard project={rightProject} />
          </div>

          <section className="mt-10">
            <div className="mb-4">
              <p className="text-xs text-muted">Metricas lado a lado</p>
              <h2 className="mt-1 font-title text-2xl tracking-tight">Tabela de comparacao</h2>
            </div>

            <div className="grid gap-3">
              {rows.map((row) => (
                <Card key={row.label} className="p-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_0.8fr_0.8fr] md:items-center">
                    <p className="text-sm font-semibold">{row.label}</p>
                    <div className="rounded-3xl border border-border/70 bg-background/25 px-4 py-3 text-sm">
                      {row.left}
                    </div>
                    <div className="rounded-3xl border border-border/70 bg-background/25 px-4 py-3 text-sm">
                      {row.right}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
