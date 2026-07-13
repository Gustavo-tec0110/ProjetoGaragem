import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  Eye,
  Flame,
  Heart,
  MessageSquare,
  Sparkles,
} from "lucide-react";

import { ProjectImage } from "@/components/projects/project-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PremiumCard } from "@/components/ui/premium-card";
import type { Project } from "@/lib/projects/types";
import {
  buildProjectHref,
  formatProjectCurrency,
  getProjectEngagementScore,
  projectMatchesTheme,
} from "@/lib/projects/utils";

type RankingCategoryKey =
  | "geral"
  | "curtidos"
  | "vistos"
  | "salvos"
  | "jdm"
  | "off-road"
  | "turbo"
  | "stance"
  | "classicos"
  | "sleeper";

type RankingMetricKind = "score" | "likes" | "views" | "saves";

type RankingCategory = {
  key: RankingCategoryKey;
  label: string;
  description: string;
  metricLabel: string;
  metricKind: RankingMetricKind;
  themeTerms?: string[];
};

const METRIC_ICONS = {
  score: Flame,
  likes: Heart,
  views: Eye,
  saves: Bookmark,
} as const;

type RankedProject = {
  project: Project;
  position: number;
  metricValue: number;
};

const RANKING_CATEGORIES: RankingCategory[] = [
  {
    key: "geral",
    label: "Geral",
    description: "Projetos em alta considerando curtidas, views, comentarios e atividade recente.",
    metricLabel: "Indice PG",
    metricKind: "score",
  },
  {
    key: "curtidos",
    label: "Mais curtidos",
    description: "Os builds que mais receberam aprovacao da comunidade.",
    metricLabel: "Curtidas",
    metricKind: "likes",
  },
  {
    key: "vistos",
    label: "Mais vistos",
    description: "Projetos que mais puxaram visualizacoes na vitrine.",
    metricLabel: "Views",
    metricKind: "views",
  },
  {
    key: "salvos",
    label: "Mais salvos",
    description: "Builds que a comunidade mais guardou para acompanhar depois.",
    metricLabel: "Salvos",
    metricKind: "saves",
  },
  {
    key: "jdm",
    label: "JDM",
    description: "Projetos com DNA japones, VTEC, import e pegada oriental.",
    metricLabel: "Curtidas",
    metricKind: "likes",
    themeTerms: ["jdm", "vtec", "honda", "toyota", "nissan", "subaru", "mitsubishi", "mazda", "lexus"],
  },
  {
    key: "off-road",
    label: "Off-road",
    description: "Trilha, overland, 4x4 e preparos pensados para sair do asfalto.",
    metricLabel: "Curtidas",
    metricKind: "likes",
    themeTerms: ["off road", "offroad", "4x4", "trilha", "overland"],
  },
  {
    key: "turbo",
    label: "Turbo",
    description: "Projetos com pressao, boost e acerto para empurrar forte.",
    metricLabel: "Curtidas",
    metricKind: "likes",
    themeTerms: ["turbo", "boost", "pressurizado"],
  },
  {
    key: "stance",
    label: "Stance",
    description: "Fitment, altura no ponto e acabamento de vitrine.",
    metricLabel: "Curtidas",
    metricKind: "likes",
    themeTerms: ["stance", "fitment", "rebaixado", "baixo", "airride"],
  },
  {
    key: "classicos",
    label: "Classicos",
    description: "Restomod, antigos e projetos com alma de colecao.",
    metricLabel: "Curtidas",
    metricKind: "likes",
    themeTerms: ["classico", "classicos", "restomod", "antigo", "aircooled", "vintage"],
  },
  {
    key: "sleeper",
    label: "Sleeper",
    description: "Visual discreto por fora, surpresa mecanica por dentro.",
    metricLabel: "Curtidas",
    metricKind: "likes",
    themeTerms: ["sleeper", "discreto", "oem plus", "oemplus", "original", "clean"],
  },
] as const;

function getCategoryHref(key: RankingCategoryKey) {
  return key === "geral" ? "/rankings" : `/rankings?categoria=${encodeURIComponent(key)}`;
}

function getMetricValue(project: Project, metricKind: RankingMetricKind) {
  if (metricKind === "likes") return project.likes;
  if (metricKind === "views") return project.views;
  if (metricKind === "saves") return project.saves;
  return getProjectEngagementScore(project);
}

function formatMetric(metricKind: RankingMetricKind, value: number) {
  const formatted = value.toLocaleString("pt-BR");
  return metricKind === "score" ? `${formatted} pts` : formatted;
}

function compareProjects(left: Project, right: Project, metricKind: RankingMetricKind) {
  const primary = getMetricValue(right, metricKind) - getMetricValue(left, metricKind);
  if (primary !== 0) return primary;
  if (right.likes !== left.likes) return right.likes - left.likes;
  if (right.saves !== left.saves) return right.saves - left.saves;
  if (right.views !== left.views) return right.views - left.views;
  return (
    new Date(right.lastUpdateAt ?? right.updatedAt).getTime() -
    new Date(left.lastUpdateAt ?? left.updatedAt).getTime()
  );
}

function getRankedProjects(projects: Project[], category: RankingCategory): RankedProject[] {
  const filtered = category.themeTerms?.length
    ? projects.filter((project) => projectMatchesTheme(project, category.themeTerms ?? []))
    : projects;

  return [...filtered]
    .sort((left, right) => compareProjects(left, right, category.metricKind))
    .map((project, index) => ({
      project,
      position: index + 1,
      metricValue: getMetricValue(project, category.metricKind),
    }));
}

function PositionBadge({ position }: { position: number }) {
  const variant =
    position === 1 ? "warning" : position === 2 ? "secondary" : position === 3 ? "default" : "secondary";

  return <Badge variant={variant}>{position}o lugar</Badge>;
}

function CategoryPills({ selectedKey }: { selectedKey: RankingCategoryKey }) {
  return (
    <div className="mt-8 flex flex-wrap gap-2">
      {RANKING_CATEGORIES.map((category) => (
        <Button
          key={category.key}
          asChild
          variant={category.key === selectedKey ? "default" : "outline"}
          size="sm"
          className={category.key === selectedKey ? "shadow-glow" : undefined}
        >
          <Link href={getCategoryHref(category.key)}>{category.label}</Link>
        </Button>
      ))}
    </div>
  );
}

function OverviewCard({
  label,
  project,
  metricKind,
}: {
  label: string;
  project: Project | undefined;
  metricKind: RankingMetricKind;
}) {
  const Icon = METRIC_ICONS[metricKind];

  return (
    <Card className="border-border/70 bg-background/25 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">{label}</p>
          <p className="mt-2 font-title text-xl tracking-tight">
            {project ? formatMetric(metricKind, getMetricValue(project, metricKind)) : "--"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {project ? project.title : "Sem projetos suficientes"}
          </p>
        </div>
        <span className="inline-flex size-11 items-center justify-center rounded-3xl border border-border/70 bg-background/35">
          <Icon className="size-5 text-accent" />
        </span>
      </div>
    </Card>
  );
}

function PodiumCard({
  entry,
  category,
}: {
  entry: RankedProject;
  category: RankingCategory;
}) {
  const { project, position, metricValue } = entry;
  const isChampion = position === 1;
  const Icon = METRIC_ICONS[category.metricKind];

  return (
    <PremiumCard
      className={`group overflow-hidden rounded-3xl border-border/70 bg-background/35 lg:rounded-4xl ${
        isChampion ? "lg:translate-y-[-18px]" : ""
      }`}
    >
      <div className="lg:hidden">
        <Link
          href={buildProjectHref(project.slug)}
          className="block outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-surface">
            <ProjectImage
              src={project.mainImage}
              alt={`Foto do projeto ${project.title}`}
              fill
              className="object-cover"
              sizes="(max-width: 639px) 46vw, (max-width: 1023px) 30vw, 24vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/25" />
            <div className="absolute inset-x-2 top-2 flex items-center justify-between gap-1">
              <PositionBadge position={position} />
              <Badge className="max-w-[55%] truncate" variant="secondary">
                {project.style}
              </Badge>
            </div>
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-xs font-semibold text-white">
              <Icon className="size-3.5 text-accent" aria-hidden="true" />
              {formatMetric(category.metricKind, metricValue)}
            </span>
          </div>
          <div className="p-3">
            <h3 className="line-clamp-2 min-h-10 font-title text-base leading-5 tracking-tight">
              {project.title}
            </h3>
            <p className="mt-1 truncate text-xs text-muted">
              {project.carModel} - {project.year}
            </p>
          </div>
        </Link>
        <div className="grid grid-cols-3 border-y border-border/60 text-xs text-muted">
          <span className="flex min-h-9 items-center justify-center gap-1 border-r border-border/60">
            <Heart className="size-3.5 text-accent" aria-hidden="true" />
            {project.likes.toLocaleString("pt-BR")}
          </span>
          <span className="flex min-h-9 items-center justify-center gap-1 border-r border-border/60">
            <Eye className="size-3.5 text-accent" aria-hidden="true" />
            {project.views.toLocaleString("pt-BR")}
          </span>
          <span className="flex min-h-9 items-center justify-center gap-1">
            <Bookmark className="size-3.5 text-accent" aria-hidden="true" />
            {project.saves.toLocaleString("pt-BR")}
          </span>
        </div>
        <div className="p-2">
          <Link
            href={buildProjectHref(project.slug)}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-3xl bg-accent px-3 text-xs font-semibold text-accent-foreground outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-accent"
          >
            Abrir projeto
          </Link>
        </div>
      </div>

      <div className="hidden lg:block">
      <div className={`relative overflow-hidden ${isChampion ? "aspect-[4/4.6]" : "aspect-[4/4.2]"}`}>
        <ProjectImage
          src={project.mainImage}
          alt={`Foto do projeto ${project.title}`}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(min-width: 1280px) 24vw, (min-width: 768px) 36vw, 92vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
        <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3">
          <PositionBadge position={position} />
          <Badge variant="secondary">{project.style}</Badge>
        </div>
        <div className="absolute inset-x-4 bottom-4">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">
            {position === 1 ? "Projeto lider" : "Podio"}
          </p>
          <h3 className={`mt-2 font-title tracking-tight ${isChampion ? "text-3xl" : "text-2xl"}`}>
            {project.title}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {project.carModel} - {project.year}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3 rounded-3xl border border-border/70 bg-background/25 px-4 py-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted">
              {category.metricLabel}
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {formatMetric(category.metricKind, metricValue)}
            </p>
          </div>
          <span className="inline-flex size-11 items-center justify-center rounded-3xl border border-accent/20 bg-accent/10">
            <Icon className="size-5 text-accent" />
          </span>
        </div>

        <p className="text-sm text-foreground/85">{project.shortDescription}</p>

        <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted">
          <div className="rounded-3xl border border-border/70 bg-background/25 px-3 py-2">
            <Heart className="mx-auto mb-1 size-4 text-accent" />
            {project.likes.toLocaleString("pt-BR")}
          </div>
          <div className="rounded-3xl border border-border/70 bg-background/25 px-3 py-2">
            <Eye className="mx-auto mb-1 size-4 text-accent" />
            {project.views.toLocaleString("pt-BR")}
          </div>
          <div className="rounded-3xl border border-border/70 bg-background/25 px-3 py-2">
            <Bookmark className="mx-auto mb-1 size-4 text-accent" />
            {project.saves.toLocaleString("pt-BR")}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {project.tags.slice(0, 3).map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
          {project.tags.length > 3 ? <Badge variant="secondary">+{project.tags.length - 3}</Badge> : null}
        </div>

        <Button asChild className="w-full">
          <Link href={buildProjectHref(project.slug)}>
            Abrir projeto
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
      </div>
    </PremiumCard>
  );
}

function RankingRow({
  entry,
  category,
}: {
  entry: RankedProject;
  category: RankingCategory;
}) {
  const { project, position, metricValue } = entry;
  const Icon = METRIC_ICONS[category.metricKind];

  return (
    <Card className="border-border/70 bg-background/20 p-3">
      <div className="md:hidden">
        <Link
          href={buildProjectHref(project.slug)}
          className="flex min-w-0 gap-3 rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-border/70 bg-surface">
            <ProjectImage
              src={project.mainImage}
              alt={`Foto do projeto ${project.title}`}
              fill
              className="object-cover"
              sizes="96px"
            />
            <span className="absolute left-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-black/70 font-title text-sm text-white">
              {position}
            </span>
          </div>
          <div className="min-w-0 flex-1 py-1">
            <h3 className="line-clamp-2 font-title text-lg leading-5 tracking-tight">
              {project.title}
            </h3>
            <p className="mt-1 truncate text-xs text-muted">
              {[project.brand, project.model, project.year ? String(project.year) : null]
                .filter(Boolean)
                .join(" - ")}
            </p>
            <Badge className="mt-2 max-w-full truncate" variant="secondary">
              {project.style}
            </Badge>
          </div>
        </Link>
        <div className="mt-2 flex min-h-11 items-center justify-between gap-3 rounded-3xl border border-border/70 bg-background/25 px-3 text-xs">
          <span className="text-muted">{category.metricLabel}</span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
            <Icon className="size-4 text-accent" aria-hidden="true" />
            {formatMetric(category.metricKind, metricValue)}
          </span>
        </div>
      </div>

      <div className="hidden gap-4 md:flex md:items-center">
        <div className="flex items-center gap-3 md:min-w-20">
          <div className="inline-flex size-12 items-center justify-center rounded-3xl border border-border/70 bg-background/35 font-title text-lg tracking-tight">
            {position}
          </div>
          <PositionBadge position={position} />
        </div>

        <Link href={buildProjectHref(project.slug)} className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-3xl border border-border/70 bg-surface">
            <ProjectImage
              src={project.mainImage}
              alt={`Foto do projeto ${project.title}`}
              fill
              className="object-cover"
              sizes="112px"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate font-title text-xl tracking-tight">{project.title}</h3>
            <p className="mt-1 text-sm text-muted">
              {[project.brand, project.model, project.year ? String(project.year) : null]
                .filter(Boolean)
                .join(" - ")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">{project.style}</Badge>
              {project.tags.slice(0, 2).map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          </div>
        </Link>

        <div className="grid gap-2 md:min-w-56">
          <div className="rounded-3xl border border-border/70 bg-background/25 px-4 py-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted">{category.metricLabel}</span>
              <span className="inline-flex items-center gap-2 font-semibold text-foreground">
                <Icon className="size-4 text-accent" />
                {formatMetric(category.metricKind, metricValue)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted">
              <span>{project.comments.toLocaleString("pt-BR")} comentarios</span>
              <span>{formatProjectCurrency(project.totalInvested ?? project.estimatedCost)}</span>
            </div>
          </div>

          <Button asChild variant="outline">
            <Link href={buildProjectHref(project.slug)}>Abrir projeto</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function isRankingCategoryKey(value: string): value is RankingCategoryKey {
  return RANKING_CATEGORIES.some((category) => category.key === value);
}

export function ProjectRankingsBoard({
  projects,
  selectedCategoryKey,
  source,
  notice,
}: {
  projects: Project[];
  selectedCategoryKey: RankingCategoryKey;
  source: "supabase" | "demo";
  notice: string | null;
}) {
  const category =
    RANKING_CATEGORIES.find((entry) => entry.key === selectedCategoryKey) ?? RANKING_CATEGORIES[0];
  const rankedProjects = getRankedProjects(projects, category);
  const podium = rankedProjects.slice(0, 3);
  const leaderboard = rankedProjects.slice(3);
  const champion = podium.find((entry) => entry.position === 1)?.project;
  const topLiked = getRankedProjects(projects, RANKING_CATEGORIES[1])[0]?.project;
  const topViewed = getRankedProjects(projects, RANKING_CATEGORIES[2])[0]?.project;
  const topSaved = getRankedProjects(projects, RANKING_CATEGORIES[3])[0]?.project;

  return (
    <div className="mx-auto w-full max-w-6xl pt-20 pb-12 md:pt-24">
      <section className="relative overflow-hidden rounded-5xl border border-border/70 bg-background/35 p-6 shadow-elevated md:p-8">
        <div className="absolute inset-0 pg-grid-bg opacity-80" aria-hidden="true" />
        <div className="absolute inset-0 pg-scanlines opacity-20" aria-hidden="true" />
        <div className="absolute inset-0 pg-particles opacity-35" aria-hidden="true" />

        <div className="relative">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Area de destaque</Badge>
                <Badge>{source === "supabase" ? "Base real" : "Fallback demo"}</Badge>
              </div>
              <h1 className="mt-4 font-title text-4xl tracking-tight md:text-6xl">
                Ranking de Projetos
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-muted md:text-base">
                Aqui ficam os projetos mais curtidos, vistos, salvos e em destaque da
                comunidade. O ranking troca de categoria, muda a metrica principal e
                coloca os lideres no podio.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:w-[28rem]">
              <OverviewCard label="Mais curtido" project={topLiked} metricKind="likes" />
              <OverviewCard label="Mais visto" project={topViewed} metricKind="views" />
              <OverviewCard label="Mais salvo" project={topSaved} metricKind="saves" />
            </div>
          </div>

          <CategoryPills selectedKey={category.key} />

          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Categoria atual</p>
              <h2 className="mt-2 font-title text-2xl tracking-tight md:text-3xl">
                {category.label}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted">{category.description}</p>
            </div>

            <Card className="border-border/70 bg-background/20 p-4 lg:min-w-72">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted">
                    Lider atual
                  </p>
                  <p className="mt-1 font-title text-xl tracking-tight">
                    {champion?.title ?? "Sem lider"}
                  </p>
                </div>
                <span className="inline-flex size-12 items-center justify-center rounded-3xl border border-accent/20 bg-accent/10">
                  <Sparkles className="size-5 text-accent" />
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">{category.metricLabel}</span>
                <span className="font-semibold text-foreground">
                  {podium[0] ? formatMetric(category.metricKind, podium[0].metricValue) : "--"}
                </span>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {notice ? (
        <div className="mt-8 rounded-4xl border border-warning/30 bg-warning/10 p-5 text-sm text-muted">
          {notice}
        </div>
      ) : null}

      {!rankedProjects.length ? (
        <Card className="mt-10 border-border/70 bg-background/25 p-8 text-center">
          <div className="mx-auto flex max-w-2xl flex-col items-center">
            <span className="inline-flex size-14 items-center justify-center rounded-4xl border border-border/70 bg-background/30">
              <MessageSquare className="size-6 text-accent" />
            </span>
            <h2 className="mt-5 font-title text-3xl tracking-tight">
              Ainda nao ha projetos suficientes nessa categoria
            </h2>
            <p className="mt-3 text-sm text-muted">
              O ranking continua pronto para receber novos builds. Enquanto isso, volte para
              o ranking geral ou explore projetos para descobrir novas fichas.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/rankings">Voltar ao geral</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/explorar">Ir para Explorar</Link>
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <section className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted">Podio</p>
                <h2 className="mt-2 font-title text-3xl tracking-tight">
                  Top 3 da categoria
                </h2>
              </div>
              <p className="hidden text-sm text-muted lg:block">
                O primeiro lugar fica centralizado e com destaque maximo.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:items-end">
              {podium
                .sort((left, right) => {
                  const order = [2, 1, 3];
                  return order.indexOf(left.position) - order.indexOf(right.position);
                })
                .map((entry) => (
                  <PodiumCard key={entry.project.slug} entry={entry} category={category} />
                ))}
            </div>
          </section>

          <section className="mt-12">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted">Leaderboard</p>
                <h2 className="mt-2 font-title text-3xl tracking-tight">
                  Posicoes seguintes
                </h2>
              </div>
              <p className="text-sm text-muted">
                {rankedProjects.length.toLocaleString("pt-BR")} projetos ranqueados nesta
                categoria
              </p>
            </div>

            <div className="mt-6 grid gap-3">
              {leaderboard.length ? (
                leaderboard.map((entry) => (
                  <RankingRow key={entry.project.slug} entry={entry} category={category} />
                ))
              ) : (
                <Card className="border-border/70 bg-background/25 p-6 text-center">
                  <h3 className="font-title text-2xl tracking-tight">
                    O podio ja reuniu todos os projetos desta categoria
                  </h3>
                  <p className="mt-2 text-sm text-muted">
                    Conforme novos builds entrarem, a lista completa aparece logo abaixo.
                  </p>
                </Card>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
