"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  Calendar,
  Coins,
  Eye,
  Timer,
  Wrench,
} from "lucide-react";

import { CommentForm, CommentsList } from "@/components/garage/comments";
import { ProjectFinanceChart } from "@/components/projects/project-finance-chart";
import { ProjectGrid } from "@/components/projects/project-grid";
import { ProjectImage } from "@/components/projects/project-image";
import { ProjectTimeline } from "@/components/projects/project-timeline";
import {
  ProjectSocialActions,
  syncProjectView,
} from "@/components/projects/project-social-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getLocalProjectSocialState,
  recordLocalProjectView,
  subscribeLocalProjectSocial,
} from "@/lib/projects/local-storage";
import type { Project, ProjectPart } from "@/lib/projects/types";
import type { CarCommentWithAuthor } from "@/lib/supabase/queries";
import {
  buildCompareHref,
  buildSearchHref,
  formatNumber,
  formatProjectCurrency,
  formatProjectDate,
} from "@/lib/projects/utils";

type DetailStat = {
  label: string;
  value: string;
  icon: typeof Eye;
};

type DetailSpec = {
  label: string;
  value: string | number | null | undefined;
};

type ProjectCommentThread = {
  carId: string;
  slug: string;
  ownerId: string;
  viewerId: string | null;
  viewerLoggedIn: boolean;
  comments: CarCommentWithAuthor[];
};

function formatSpecValue(value: string | number | null | undefined) {
  if (value == null || value === "") return "Nao informado";
  return String(value);
}

function Stat({ label, value, icon: Icon }: DetailStat) {
  return (
    <Card className="p-5">
      <Icon className="size-5 text-accent" />
      <p className="mt-3 text-xs text-muted">{label}</p>
      <p className="mt-1 font-title text-2xl">{value}</p>
    </Card>
  );
}

function SpecCard({ label, value }: DetailSpec) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-ui text-sm font-semibold">{formatSpecValue(value)}</p>
    </Card>
  );
}

function PartsSection({
  title,
  parts,
}: {
  title: string;
  parts: ProjectPart[];
}) {
  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted">Modificacoes</p>
          <h2 className="mt-1 font-title text-2xl tracking-tight">{title}</h2>
        </div>
        <Badge>{parts.length} itens</Badge>
      </div>

      <div className="mt-4 grid gap-3">
        {parts.length ? (
          parts.map((part) => (
            <Card key={part.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Badge variant={part.status === "installed" ? "success" : "warning"}>
                    {part.status === "installed" ? "Instalada" : "Planejada"}
                  </Badge>
                  <h3 className="mt-3 font-title text-lg tracking-tight">
                    {part.brand ? `${part.brand} ` : ""}
                    {part.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted">{part.category}</p>
                  {part.description ? (
                    <p className="mt-3 text-sm text-foreground/85">{part.description}</p>
                  ) : null}
                </div>
                <div className="min-w-36 text-left sm:text-right">
                  <p className="text-xs text-muted">Valor estimado</p>
                  <p className="mt-1 font-ui text-sm font-semibold">
                    {formatProjectCurrency(part.priceEstimate)}
                  </p>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="rounded-4xl border border-border/70 bg-background/25 p-5 text-sm text-muted">
            Nenhuma modificacao cadastrada nesta secao.
          </div>
        )}
      </div>
    </section>
  );
}

function mergeSpecs(defaultSpecs: DetailSpec[], incoming?: DetailSpec[]) {
  const map = new Map<string, DetailSpec>();
  for (const spec of [...defaultSpecs, ...(incoming ?? [])]) {
    if (!map.has(spec.label)) map.set(spec.label, spec);
  }
  return Array.from(map.values());
}

export function ProjectDetail({
  project: initialProject,
  similarProjects,
  viewerLoggedIn,
  canEdit = false,
  technicalSpecs,
  stats,
  commentThread,
  alternateRoute,
}: {
  project: Project;
  similarProjects: Project[];
  viewerLoggedIn: boolean;
  canEdit?: boolean;
  technicalSpecs?: DetailSpec[];
  stats?: DetailStat[];
  commentThread?: ProjectCommentThread | null;
  alternateRoute?: {
    href: string;
    label: string;
  } | null;
}) {
  const project = initialProject;
  const localSocialState = React.useSyncExternalStore(
    subscribeLocalProjectSocial,
    () => getLocalProjectSocialState(project.slug),
    () => ({ liked: false, saved: false, views: 0 })
  );
  const views = project.views + localSocialState.views;

  React.useEffect(() => {
    recordLocalProjectView(initialProject.slug);
    if (initialProject.source === "supabase" && initialProject.databaseId) {
      void syncProjectView(initialProject.databaseId, initialProject.slug);
    }
  }, [initialProject.databaseId, initialProject.slug, initialProject.source]);

  const gallery = project.gallery.length ? project.gallery : [project.mainImage];
  const location = [project.city, project.state].filter(Boolean).join(", ");
  const compareHref = buildCompareHref(project.slug, similarProjects[0]?.slug ?? null);
  const detailStats =
    stats ??
    [
      {
        label: "Visualizacoes",
        value: views.toLocaleString("pt-BR"),
        icon: Eye,
      },
      {
        label: "Total investido",
        value: formatProjectCurrency(project.totalInvested ?? project.estimatedCost),
        icon: Coins,
      },
      {
        label: "Atualizacoes",
        value: project.updatesCount.toLocaleString("pt-BR"),
        icon: Calendar,
      },
      {
        label: "Modificacoes",
        value: project.modificationsCount.toLocaleString("pt-BR"),
        icon: Wrench,
      },
    ];

  const defaultSpecs: DetailSpec[] = [
    { label: "Carro", value: project.carModel },
    { label: "Ano", value: project.year },
    { label: "Motor", value: project.engine },
    { label: "Categoria", value: project.style },
    { label: "Status", value: project.status },
    { label: "Quilometragem", value: formatNumber(project.mileageKm, " km") },
    { label: "Potencia", value: formatNumber(project.powerCv, " cv") },
    { label: "Torque", value: formatNumber(project.torqueNm, " Nm") },
    { label: "Peso", value: formatNumber(project.weightKg, " kg") },
    { label: "Inicio", value: formatProjectDate(project.startedAt) },
    { label: "Tempo de projeto", value: project.projectDurationLabel },
    { label: "Ultima evolucao", value: formatProjectDate(project.lastUpdateAt) },
  ];
  const detailSpecs = mergeSpecs(defaultSpecs, technicalSpecs);

  return (
    <div className="space-y-12 pb-14">
      <section className="relative min-h-[76vh] px-4 sm:px-6">
        <div className="absolute inset-0">
          <ProjectImage
            src={gallery[0]}
            alt={`Foto principal do projeto ${project.title}`}
            fill
            priority
            className="object-cover opacity-70"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/78 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/78 to-transparent" />
        </div>

        <div className="relative mx-auto flex min-h-[76vh] w-full max-w-6xl flex-col justify-end pb-10 pt-28">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{project.style}</Badge>
              <Badge>{project.status}</Badge>
              {project.source !== "supabase" ? <Badge>Modo {project.source}</Badge> : null}
              {location ? <Badge>{location}</Badge> : null}
            </div>

            <h1 className="mt-5 font-title text-4xl tracking-tight md:text-6xl">
              {project.title}
            </h1>
            <p className="mt-3 text-lg text-muted md:text-xl">
              {project.carModel} - {project.year} - {project.engine}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted">
              <span className="font-semibold text-foreground">{project.ownerName}</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-4" />
                Publicado em {formatProjectDate(project.createdAt)}
              </span>
              {project.startedAt ? (
                <span className="inline-flex items-center gap-1">
                  <Timer className="size-4" />
                  Projeto com {project.projectDurationLabel}
                </span>
              ) : null}
            </div>

            <p className="mt-5 max-w-2xl text-foreground/90">{project.description}</p>

            <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-border/70 bg-background/25 px-4 py-3">
                <p className="text-xs text-muted">Estado atual</p>
                <p className="mt-1 font-ui text-sm font-semibold">{project.status}</p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background/25 px-4 py-3">
                <p className="text-xs text-muted">Pecas instaladas</p>
                <p className="mt-1 font-ui text-sm font-semibold">
                  {project.installedParts.length.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background/25 px-4 py-3">
                <p className="text-xs text-muted">Ultima atualizacao</p>
                <p className="mt-1 font-ui text-sm font-semibold">
                  {formatProjectDate(project.lastUpdateAt)}
                </p>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <ProjectSocialActions
                slug={project.slug}
                databaseId={project.databaseId}
                initialLiked={project.viewerHasLiked}
                initialSaved={project.viewerHasSaved}
                initialLikes={project.likes}
                initialSaves={project.saves}
                mode={project.source === "supabase" ? "supabase" : "local"}
                viewerLoggedIn={viewerLoggedIn}
              />
              <Button asChild variant="outline">
                <Link href={compareHref}>
                  <ArrowRightLeft className="size-4" />
                  Comparar
                </Link>
              </Button>
              {canEdit && project.editHref ? (
                <Button asChild variant="outline">
                  <Link href={project.editHref}>Editar ficha</Link>
                </Button>
              ) : null}
              {alternateRoute ? (
                <Button asChild variant="outline">
                  <Link href={alternateRoute.href}>{alternateRoute.label}</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl space-y-12 px-4 sm:px-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {detailStats.map((stat) => (
            <Stat key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="p-5 md:p-6">
            <p className="text-xs text-muted">Meta do projeto</p>
            <h2 className="mt-2 font-title text-2xl tracking-tight">
              {project.projectGoal ?? "Objetivo ainda nao informado"}
            </h2>
            <p className="mt-3 text-sm text-foreground/85">
              {project.projectGoal
                ? "A meta declarada ajuda na descoberta, na comparacao e no acompanhamento da evolucao."
                : "Defina a meta na edicao para contextualizar o projeto como OEM+, turbo de rua, track day ou outra direcao clara."}
            </p>
          </Card>

          <Card className="p-5 md:p-6">
            <p className="text-xs text-muted">Resumo rapido</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-3xl border border-border/70 bg-background/25 p-4">
                <p className="text-xs text-muted">Ultima atualizacao</p>
                <p className="mt-1 font-ui text-sm font-semibold">
                  {formatProjectDate(project.lastUpdateAt)}
                </p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background/25 p-4">
                <p className="text-xs text-muted">Pecas instaladas</p>
                <p className="mt-1 font-title text-2xl">
                  {project.installedParts.length.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background/25 p-4">
                <p className="text-xs text-muted">Pecas planejadas</p>
                <p className="mt-1 font-title text-2xl">
                  {project.plannedParts.length.toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          </Card>
        </section>

        <section>
          <p className="text-xs text-muted">Resumo tecnico</p>
          <h2 className="mt-1 font-title text-2xl tracking-tight">Ficha do projeto</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {detailSpecs.map((spec) => (
              <SpecCard key={spec.label} label={spec.label} value={spec.value} />
            ))}
          </div>
        </section>

        <section>
          <p className="text-xs text-muted">Tags</p>
          <h2 className="mt-1 font-title text-2xl tracking-tight">Identidade do build</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {project.tags.length ? (
              project.tags.map((tag) => (
                <Link key={tag} href={buildSearchHref(tag)}>
                  <Badge>{tag}</Badge>
                </Link>
              ))
            ) : (
              <div className="rounded-4xl border border-border/70 bg-background/25 px-4 py-3 text-sm text-muted">
                Nenhuma tag cadastrada ainda.
              </div>
            )}
          </div>
        </section>

        <section>
          <p className="text-xs text-muted">Timeline</p>
          <h2 className="mt-1 font-title text-2xl tracking-tight">Evolucao do projeto</h2>
          <div className="mt-4">
            <ProjectTimeline project={project} />
          </div>
        </section>

        <section>
          <p className="text-xs text-muted">Financeiro</p>
          <h2 className="mt-1 font-title text-2xl tracking-tight">Controle de gastos</h2>
          <div className="mt-4">
            <ProjectFinanceChart project={project} />
          </div>
        </section>

        <section>
          <p className="text-xs text-muted">Galeria</p>
          <h2 className="mt-1 font-title text-2xl tracking-tight">Fotos do projeto</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((image, index) => (
              <div
                key={`${image}-${index}`}
                className="relative aspect-[4/3] overflow-hidden rounded-4xl border border-border/70 bg-surface"
              >
                <ProjectImage
                  src={image}
                  alt={`Foto ${index + 1} do projeto ${project.title}`}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
                />
              </div>
            ))}
          </div>
        </section>

        <PartsSection title="Pecas instaladas" parts={project.installedParts} />
        <PartsSection title="Pecas planejadas" parts={project.plannedParts} />

        {commentThread ? (
          <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <Card className="p-5 md:p-6">
              <h2 className="font-title text-2xl tracking-tight">Comentar</h2>
              <div className="mt-4">
                <CommentForm
                  carId={commentThread.carId}
                  slug={commentThread.slug}
                  viewerLoggedIn={commentThread.viewerLoggedIn}
                />
              </div>
            </Card>
            <div>
              <h2 className="font-title text-2xl tracking-tight">Comentarios</h2>
              <div className="mt-4">
                <CommentsList
                  comments={commentThread.comments}
                  viewerId={commentThread.viewerId}
                  ownerId={commentThread.ownerId}
                  carSlug={commentThread.slug}
                />
              </div>
            </div>
          </section>
        ) : null}

        <section>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-muted">Projetos parecidos</p>
              <h2 className="mt-1 font-title text-2xl tracking-tight">
                Continue explorando
              </h2>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/explorar">Ver mais</Link>
            </Button>
          </div>
          <div className="mt-4">
            <ProjectGrid
              projects={similarProjects}
              emptyTitle="Ainda nao encontramos projetos parecidos."
              emptyDescription="Adicione mais projetos ou explore outros estilos da comunidade."
            />
          </div>
        </section>
      </div>
    </div>
  );
}
