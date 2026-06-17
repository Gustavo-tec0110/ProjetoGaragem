"use client";

import * as React from "react";
import { getBuildAlerts, BuildAlert } from "@/lib/buildAlerts";
import Link from "next/link";
import {
  ArrowRightLeft,
  Bookmark,
  Calendar,
  Eye,
  Fuel,
  Gauge,
  Heart,
  MessageCircle,
  Settings,
  Timer,
  Users,
  Wrench,
} from "lucide-react";

import { CommentForm, CommentsList } from "@/components/garage/comments";
import { ProjectFinanceChart } from "@/components/projects/project-finance-chart";
import { ProjectGallery } from "@/components/projects/project-gallery";
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
  buildProjectHref,
  buildSearchHref,
  formatNumber,
  formatProjectCurrency,
  formatProjectDate,
} from "@/lib/projects/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type DetailStat = {
  label: string;
  value: string;
  icon: typeof Eye;
};

type DetailSpec = {
  label: string;
  value: string | number | null | undefined;
};

type QuickFact = DetailStat;

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
    <Card className="p-4 transition hover:border-accent/35">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-ui text-sm font-semibold leading-snug">{formatSpecValue(value)}</p>
    </Card>
  );
}

function QuickFactCard({ label, value, icon: Icon }: QuickFact) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-background/35">
          <Icon className="size-5 text-accent" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted">{label}</p>
          <p className="mt-1 truncate font-ui text-sm font-semibold">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function getSpecValue(specs: DetailSpec[], needle: string) {
  const normalize = (value: string) =>
    value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const normalizedNeedle = normalize(needle);
  return specs.find((spec) => normalize(spec.label).includes(normalizedNeedle))?.value;
}

function mergeSpecs(defaultSpecs: DetailSpec[], incoming?: DetailSpec[]) {
  const map = new Map<string, DetailSpec>();
  for (const spec of [...defaultSpecs, ...(incoming ?? [])]) {
    if (!map.has(spec.label)) map.set(spec.label, spec);
  }
  return Array.from(map.values());
}

function ProjectPartsShowcase({
  title,
  parts,
  eyebrow,
  emptyText,
}: {
  title: string;
  parts: ProjectPart[];
  eyebrow: string;
  emptyText: string;
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
      <Card className="p-5 md:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-muted">{eyebrow}</p>
            <h2 className="mt-1 font-title text-2xl tracking-tight">{title}</h2>
          </div>
          <Badge>{parts.length} itens</Badge>
        </div>

        <div className="mt-5 grid gap-4">
          {parts.length ? (
            Array.from(groupedParts.entries()).map(([category, categoryParts]) => (
              <div key={category} className="rounded-3xl border border-border/70 bg-background/25 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="font-title text-xl tracking-tight">{category}</h3>
                  <Badge>{categoryParts.length} itens</Badge>
                </div>

                <div className="grid gap-3">
                  {categoryParts.map((part) => (
                    <div
                      key={part.id}
                      className="grid gap-4 rounded-3xl border border-border/70 bg-surface/70 p-4 md:grid-cols-[7rem_1fr_auto]"
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
                              Ver peca
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
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-border/70 bg-background/25 p-5 text-sm text-muted">
              {emptyText}
            </div>
          )}
        </div>
      </Card>
    </section>
  );
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
  const isProjectComplete = project.progressPercent >= 100;
  const [buildAlerts, setBuildAlerts] = React.useState<BuildAlert[]>([]);
  const [comments, setComments] = React.useState<CarCommentWithAuthor[]>(commentThread?.comments ?? []);
  const [socialCounts, setSocialCounts] = React.useState({
    likes: project.likes,
    saves: project.saves,
    followers: project.followers,
    views: project.views,
  });

  // Load build alerts on component mount
  React.useEffect(() => {
    const databaseId = initialProject.databaseId;
    if (initialProject.source === "supabase" && databaseId) {
      const resolvedDatabaseId: string = databaseId;
      async function load() {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) return;

        try {
          const alerts = await getBuildAlerts(supabase, resolvedDatabaseId);
          setBuildAlerts(alerts);
        } catch {
          setBuildAlerts([]);
        }
      }
      load();
    }
  }, [initialProject.databaseId, initialProject.source]);
  const localSocialState = React.useSyncExternalStore(
    subscribeLocalProjectSocial,
    () => getLocalProjectSocialState(project.slug),
    () => ({ liked: false, saved: false, views: 0 })
  );
  const views =
    project.source === "supabase"
      ? socialCounts.views
      : project.views + localSocialState.views;

  React.useEffect(() => {
    if (initialProject.source === "supabase" && initialProject.databaseId) {
      const sessionKey = `pg-project-viewed:${initialProject.slug}:supabase`;
      if (window.sessionStorage.getItem(sessionKey)) return;
      window.sessionStorage.setItem(sessionKey, "1");

      void syncProjectView(initialProject.databaseId, initialProject.slug).then((result) => {
        if (result?.ok && "viewsCount" in result && typeof result.viewsCount === "number") {
          const viewsCount = result.viewsCount;
          setSocialCounts((current) => ({ ...current, views: viewsCount }));
        }
      });
      return;
    }
    recordLocalProjectView(initialProject.slug);
  }, [initialProject.databaseId, initialProject.slug, initialProject.source]);

  const gallery = project.gallery.length ? project.gallery : [project.mainImage];
  const location = [project.city, project.state].filter(Boolean).join(", ");
  const compareHref = buildCompareHref(project.slug, similarProjects[0]?.slug ?? null);
  const detailStats =
    stats ??
    [
      {
        label: "Curtidas",
        value: socialCounts.likes.toLocaleString("pt-BR"),
        icon: Heart,
      },
      {
        label: "Salvos",
        value: socialCounts.saves.toLocaleString("pt-BR"),
        icon: Bookmark,
      },
      {
        label: "Comentários",
        value: (commentThread ? comments.length : project.comments).toLocaleString("pt-BR"),
        icon: MessageCircle,
      },
      {
        label: "Views",
        value: views.toLocaleString("pt-BR"),
        icon: Eye,
      },
      {
        label: "Seguidores",
        value: socialCounts.followers.toLocaleString("pt-BR"),
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
    { label: "�altima evolução", value: formatProjectDate(project.lastUpdateAt) },
  ];
  const detailSpecs = mergeSpecs(defaultSpecs, technicalSpecs);
  const brand = getSpecValue(detailSpecs, "marca") ?? project.brand;
  const model = getSpecValue(detailSpecs, "modelo") ?? project.model;
  const version = getSpecValue(detailSpecs, "versao");
  const fuel = getSpecValue(detailSpecs, "combustivel");
  const transmission = getSpecValue(detailSpecs, "cambio atual") ?? getSpecValue(detailSpecs, "cambio");
  const drivetrain =
    getSpecValue(detailSpecs, "tracao atual") ??
    getSpecValue(detailSpecs, "tracao") ??
    project.factoryDrivetrain;
  const vehicleLine = [brand, model, project.year, version].filter(Boolean).join(" ");
  const carNickname =
    project.shortDescription &&
    project.shortDescription !== project.title &&
    project.shortDescription.length <= 80
      ? project.shortDescription
      : null;
  const quickFacts: QuickFact[] = [
    {
      label: "Potência",
      value: formatNumber(project.powerCv, " cv"),
      icon: Gauge,
    },
    {
      label: "Combustível",
      value: formatSpecValue(fuel),
      icon: Fuel,
    },
    {
      label: "Câmbio",
      value: formatSpecValue(transmission),
      icon: Settings,
    },
    {
      label: "Tração",
      value: formatSpecValue(drivetrain),
      icon: ArrowRightLeft,
    },
    {
      label: "Status",
      value: project.status,
      icon: Wrench,
    },
  ];

  return (
    <div className="space-y-12 pb-14">
      <section className="pg-grid-bg relative overflow-hidden px-4 sm:px-6">
        <div className="absolute inset-0">
          <ProjectImage
            src={gallery[0]}
            alt={`Foto principal do projeto ${project.title}`}
            fill
            priority
            loading="eager"
            className="object-cover opacity-30"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/88 to-background/45" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/20" />
        </div>

        <div className="relative mx-auto grid min-h-[78vh] w-full max-w-6xl gap-8 pb-10 pt-28 lg:grid-cols-[1fr_0.9fr] lg:items-end">
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
            {carNickname ? (
              <p className="mt-3 font-title text-2xl text-accent md:text-3xl">
                {carNickname}
              </p>
            ) : null}
            <p className="mt-3 text-lg text-muted md:text-xl">
              {vehicleLine || `${project.carModel} - ${project.year}`} - {project.engine}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted">
              {project.ownerUsername ? (
                <Link
                  href={`/perfil/${project.ownerUsername}`}
                  className="font-semibold text-foreground hover:text-accent"
                >
                  Projeto de {project.ownerName}
                </Link>
              ) : (
                <span className="font-semibold text-foreground">Projeto de {project.ownerName}</span>
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
                <p className="text-xs text-muted">�altima atualização</p>
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
                onCountsChange={(counts) =>
                  setSocialCounts((current) => ({
                    likes: counts.likes ?? current.likes,
                    saves: counts.saves ?? current.saves,
                    followers: counts.followers ?? current.followers,
                    views: current.views,
                  }))
                }
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

          <div className="relative min-h-[22rem] overflow-hidden rounded-4xl border border-border/70 bg-surface shadow-elevated lg:min-h-[34rem]">
            <ProjectImage
              src={gallery[0]}
              alt={`Foto principal do projeto ${project.title}`}
              fill
              priority
              loading="eager"
              className="object-cover"
              sizes="(min-width: 1024px) 42vw, 100vw"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 to-transparent p-5">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{project.progressPercent}% completo</Badge>
                <Badge>{project.installedParts.length} instaladas</Badge>
                <Badge>{project.plannedParts.length} planos</Badge>
              </div>
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
                  {isProjectComplete
                    ? "Projeto completo"
                    : `Projeto ${project.progressPercent}% completo`}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {isProjectComplete
                    ? "A ficha essencial está completa. Você ainda pode editar informações ou adicionar extras opcionais."
                    : "O 100% depende só dos dados essenciais: ficha pública, foto, especificações principais e objetivo."}
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href={project.editHref}>
                {isProjectComplete ? "Editar informações" : "Completar detalhes"}
              </Link>
            </Button>
          </Card>
        ) : null}

        <section id="visao-geral" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {detailStats.map((stat) => (
            <Stat key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
          ))}
        </section>

        <section>
          <p className="text-xs text-muted">Resumo rapido</p>
          <h2 className="mt-1 font-title text-2xl tracking-tight">Dados essenciais</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {quickFacts.map((fact) => (
              <QuickFactCard
                key={fact.label}
                label={fact.label}
                value={fact.value}
                icon={fact.icon}
              />
            ))}
          </div>
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
            <p className="text-xs text-muted">Atividade recente</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-3xl border border-border/70 bg-background/25 p-4">
                <p className="text-xs text-muted">�altima atualização</p>
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
                current: transmission,
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
          {/* Alertas da Build */}
          <div className="mb-6">
            <h3 className="text-xs text-muted mb-2">Alertas da Build</h3>
            {buildAlerts.length ? (
              <ul className="space-y-2">
                {buildAlerts.map((alert, idx) => (
                  <li key={idx} className={`p-3 rounded-xl border ${
                    alert.severity === 'info' ? 'border-blue-400 bg-blue-50' :
                    alert.severity === 'success' ? 'border-green-400 bg-green-50' :
                    alert.severity === 'warning' ? 'border-yellow-400 bg-yellow-50' :
                    'border-red-400 bg-red-50'}
                  }`}
                  >
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-sm text-muted">{alert.message}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nenhum alerta relevante.</p>
            )}
          </div>
          <ProjectPartsShowcase
            title="Modificações atuais"
            eyebrow="Instaladas no projeto"
            parts={project.installedParts}
            emptyText="Nenhuma modificacao atual cadastrada."
          />
          <ProjectPartsShowcase
            title="Planos futuros"
            eyebrow="Próximos passos"
            parts={project.plannedParts}
            emptyText="Nenhum plano futuro cadastrado."
          />
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

        <section id="timeline">
          <p className="text-xs text-muted">Timeline</p>
          <h2 className="mt-1 font-title text-2xl tracking-tight">Evolução do projeto</h2>
          <div className="mt-4">
            <ProjectTimeline project={project} />
          </div>
        </section>

        {commentThread ? (
          <section id="comentarios" className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <Card className="p-5 md:p-6">
              <p className="text-xs text-muted">Comentários</p>
              <h2 className="font-title text-2xl tracking-tight">Comentar</h2>
              <p className="mt-2 text-sm text-muted">
                Área preparada para dúvidas, feedback e próximas atualizações do projeto.
              </p>
              <div className="mt-4">
                <CommentForm
                  carId={commentThread.carId}
                  slug={commentThread.slug}
                  viewerLoggedIn={commentThread.viewerLoggedIn}
                  onCommentCreated={(comment) =>
                    setComments((current) =>
                      current.some((item) => item.id === comment.id) ? current : [comment, ...current]
                    )
                  }
                />
              </div>
            </Card>
            <div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-muted">Discussão</p>
                  <h2 className="font-title text-2xl tracking-tight">Comentários</h2>
                </div>
                <Badge>{comments.length} mensagens</Badge>
              </div>
              <div className="mt-4">
                <CommentsList
                  comments={comments}
                  viewerId={commentThread.viewerId}
                  ownerId={commentThread.ownerId}
                  carSlug={commentThread.slug}
                  onCommentDeleted={(commentId) =>
                    setComments((current) => current.filter((comment) => comment.id !== commentId))
                  }
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
