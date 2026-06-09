"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  Bookmark,
  Calendar,
  Eye,
  Gauge,
  Heart,
  MessageCircle,
  Timer,
  Users,
} from "lucide-react";

import { CommentForm, CommentsList } from "@/components/garage/comments";
import { ProjectFinanceChart } from "@/components/projects/project-finance-chart";
import { ProjectGallery } from "@/components/projects/project-gallery";
import { ProjectGrid } from "@/components/projects/project-grid";
import { ProjectImage } from "@/components/projects/project-image";
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
  buildProjectHref,
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
  if (value == null || value === "") return "Não informado";
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
  emptyText = "Nenhuma modificação cadastrada nesta seção.",
}: {
  title: string;
  parts: ProjectPart[];
  emptyText?: string;
}) {
  const groupedParts = parts.reduce((map, part) => {
    const category = part.category || "Outros";
    const current = map.get(category) ?? [];
    current.push(part);
    map.set(category, current);
    return map;
  }, new Map<string, ProjectPart[]>());

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
          Array.from(groupedParts.entries()).map(([category, categoryParts]) => (
            <Card key={category} className="p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="font-title text-xl tracking-tight">{category}</h3>
                <Badge>{categoryParts.length} itens</Badge>
              </div>
              <div className="grid gap-3">
                {categoryParts.map((part) => (
                  <div
                    key={part.id}
                    className="grid gap-4 rounded-3xl border border-border/70 bg-background/25 p-4 md:grid-cols-[7rem_1fr_auto]"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-3xl border border-border/70 bg-surface">
                      {part.imageUrl ? (
                        <ProjectImage
                          src={part.imageUrl}
                          alt={`Imagem de ${part.name}`}
                          fill
                          className="object-cover"
                          sizes="112px"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-background/10 to-background/65" />
                      )}
                    </div>
                    <div>
                      <Badge
                        variant={
                          part.status === "installed"
                            ? "success"
                            : part.status === "removed"
                              ? "secondary"
                              : "warning"
                        }
                      >
                        {part.status === "installed"
                          ? "Instalada"
                          : part.status === "removed"
                            ? "Removida"
                            : "Planejada"}
                      </Badge>
                      <h4 className="mt-3 font-title text-lg tracking-tight">
                        {part.brand ? `${part.brand} ` : ""}
                        {part.name}
                      </h4>
                      {part.description ? (
                        <p className="mt-2 text-sm text-foreground/85">{part.description}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                        {part.installedAt ? <span>Instalada em {formatProjectDate(part.installedAt)}</span> : null}
                        {part.externalUrl ? (
                          <Link href={part.externalUrl} target="_blank" rel="noreferrer" className="font-semibold text-foreground">
                            Ver peça
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    <div className="min-w-36 text-left md:text-right">
                      <p className="text-xs text-muted">Valor estimado</p>
                      <p className="mt-1 font-ui text-sm font-semibold">
                        {formatProjectCurrency(part.priceEstimate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))
        ) : (
          <div className="rounded-4xl border border-border/70 bg-background/25 p-5 text-sm text-muted">
            {emptyText}
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
        label: "Curtidas",
        value: project.likes.toLocaleString("pt-BR"),
        icon: Heart,
      },
      {
        label: "Salvos",
        value: project.saves.toLocaleString("pt-BR"),
        icon: Bookmark,
      },
      {
        label: "Comentários",
        value: project.comments.toLocaleString("pt-BR"),
        icon: MessageCircle,
      },
      {
        label: "Views",
        value: views.toLocaleString("pt-BR"),
        icon: Eye,
      },
      {
        label: "Seguidores",
        value: project.followers.toLocaleString("pt-BR"),
        icon: Users,
      },
    ];

  const defaultSpecs: DetailSpec[] = [
    { label: "Carro", value: project.carModel },
    { label: "Ano", value: project.year },
    { label: "Motor atual", value: project.engine },
    { label: "Alimentação atual", value: project.currentInduction },
    { label: "Categoria", value: project.style },
    { label: "Quilometragem", value: formatNumber(project.mileageKm, " km") },
    { label: "Potência atual", value: formatNumber(project.powerCv, " cv") },
    { label: "Torque", value: formatNumber(project.torqueNm, " Nm") },
    { label: "Peso", value: formatNumber(project.weightKg, " kg") },
    { label: "Início", value: formatProjectDate(project.startedAt) },
    { label: "Tempo de projeto", value: project.projectDurationLabel },
    { label: "Última evolução", value: formatProjectDate(project.lastUpdateAt) },
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
            loading="eager"
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
              {project.ownerUsername ? (
                <Link
                  href={`/perfil/${project.ownerUsername}`}
                  className="font-semibold text-foreground hover:text-accent"
                >
                  {project.ownerName}
                </Link>
              ) : (
                <span className="font-semibold text-foreground">{project.ownerName}</span>
              )}
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
                <p className="text-xs text-muted">Modificações instaladas</p>
                <p className="mt-1 font-ui text-sm font-semibold">
                  {project.installedParts.length.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background/25 px-4 py-3">
                <p className="text-xs text-muted">Última atualização</p>
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
                initialFollowed={project.viewerHasFollowed}
                initialFollowers={project.followers}
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
              <Button asChild variant="outline">
                <Link href={`${buildProjectHref(project.slug)}/evolucao`}>
                  <Calendar className="size-4" />
                  Evolução
                </Link>
              </Button>
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
        <nav className="flex gap-2 overflow-x-auto rounded-4xl border border-border/70 bg-background/25 p-2">
          {[
            { href: "#visao-geral", label: "Visão geral" },
            { href: "#modificacoes", label: "Modificações" },
            { href: `${buildProjectHref(project.slug)}/evolucao`, label: "Evolução" },
            { href: "#comentarios", label: "Comentários" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-3xl border border-border/70 px-4 py-2 text-sm font-ui font-semibold text-muted transition hover:bg-background/50 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {canEdit && project.editHref ? (
          <Card className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6">
            <div className="flex items-start gap-3">
              <Gauge className="mt-1 size-5 text-red-400" />
              <div>
                <p className="text-xs text-warning">Ficha do veículo</p>
                <h2 className="mt-1 font-title text-xl tracking-tight">
                  Ficha {project.specConfidencePercent ?? 20}% confirmada
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Complete versão, mecânica, visual, interior e suspensão quando souber mais detalhes.
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href={project.editHref}>Completar detalhes</Link>
            </Button>
          </Card>
        ) : null}

        <section id="visao-geral" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {detailStats.map((stat) => (
            <Stat key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="p-5 md:p-6">
            <p className="text-xs text-muted">Meta do projeto</p>
            <h2 className="mt-2 font-title text-2xl tracking-tight">
              {project.projectGoal ?? "Objetivo ainda não informado"}
            </h2>
            <p className="mt-3 text-sm text-foreground/85">
              {project.projectGoal
                ? "A meta declarada ajuda na descoberta, na comparação e no acompanhamento da evolução."
                : "Defina a meta na edição para contextualizar o projeto como OEM+, turbo de rua, track day ou outra direção clara."}
            </p>
          </Card>

          <Card className="p-5 md:p-6">
            <p className="text-xs text-muted">Resumo rapido</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-3xl border border-border/70 bg-background/25 p-4">
                <p className="text-xs text-muted">Última atualização</p>
                <p className="mt-1 font-ui text-sm font-semibold">
                  {formatProjectDate(project.lastUpdateAt)}
                </p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background/25 p-4">
                <p className="text-xs text-muted">Peças instaladas</p>
                <p className="mt-1 font-title text-2xl">
                  {project.installedParts.length.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background/25 p-4">
                <p className="text-xs text-muted">Peças planejadas</p>
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
          <p className="text-xs text-muted">Original x atual</p>
          <h2 className="mt-1 font-title text-2xl tracking-tight">Comparação de especificação</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[
              {
                label: "Motor",
                factory: project.factoryEngine,
                current: project.engine,
              },
              {
                label: "Alimentação",
                factory: project.factoryInduction,
                current: project.currentInduction,
              },
              {
                label: "Potência",
                factory: formatNumber(project.factoryPowerCv, " cv"),
                current: formatNumber(project.powerCv, " cv"),
              },
              {
                label: "Câmbio",
                factory: project.factoryTransmission,
                current: detailSpecs.find((spec) => spec.label.toLowerCase().includes("cambio"))?.value,
              },
            ].map((row) => (
              <Card key={row.label} className="grid gap-4 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted">{row.label} de fábrica</p>
                  <p className="mt-1 text-sm font-ui font-semibold">
                    {formatSpecValue(row.factory)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">{row.label} atual</p>
                  <p className="mt-1 text-sm font-ui font-semibold">
                    {formatSpecValue(row.current)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
          {project.factorySpecsNote ? (
            <p className="mt-3 text-xs text-muted">{project.factorySpecsNote}</p>
          ) : null}
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

        <div id="modificacoes" className="space-y-8">
          <PartsSection title="Modificações instaladas hoje" parts={project.installedParts} />
          <PartsSection title="Planos futuros" parts={project.plannedParts} />
        </div>

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
          <div className="mt-4">
            <ProjectGallery images={gallery} title={project.title} />
          </div>
        </section>

        {commentThread ? (
          <section id="comentarios" className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
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
              emptyTitle="Ainda não encontramos projetos parecidos."
              emptyDescription="Adicione mais projetos ou explore outros estilos da comunidade."
            />
          </div>
        </section>
      </div>
    </div>
  );
}
