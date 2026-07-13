import Link from "next/link";
import {
  ArrowRightLeft,
  Bookmark,
  Coins,
  Eye,
  Heart,
  MessageSquare,
  TimerReset,
  Wrench,
} from "lucide-react";

import { ProjectImage } from "@/components/projects/project-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PremiumCard } from "@/components/ui/premium-card";
import type { Project } from "@/lib/projects/types";
import {
  buildCompareHref,
  buildProjectHref,
  buildSearchHref,
  formatProjectCurrency,
  formatProjectDate,
} from "@/lib/projects/utils";

function sourceLabel(project: Project) {
  if (project.source === "local") return "Demo local";
  if (project.source === "demo") return "Projeto demo";
  return null;
}

export function ProjectCard({
  project,
  imageLoading = "lazy",
}: {
  project: Project;
  imageLoading?: "eager" | "lazy";
}) {
  const projectHref = buildProjectHref(project.slug);
  const compareHref = buildCompareHref(project.slug);
  const image = project.gallery[0] ?? project.mainImage;
  const location = [project.city, project.state].filter(Boolean).join(", ");
  const source = sourceLabel(project);

  return (
    <PremiumCard
      className="group overflow-hidden rounded-3xl md:rounded-4xl"
      data-testid="project-card"
    >
      <div className="md:hidden" data-project-card-layout="mobile">
        <Link
          href={projectHref}
          className="block rounded-t-3xl outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-surface">
            <ProjectImage
              src={image}
              alt={`Foto do projeto ${project.title}`}
              fill
              loading={imageLoading}
              className="object-cover opacity-90"
              sizes="(max-width: 767px) 46vw, 92vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />
            <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-1">
              <Badge className="max-w-[70%] truncate px-2 py-0.5 text-[11px]" variant="secondary">
                {project.style}
              </Badge>
              {project.viewerHasSaved ? (
                <span
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/55 text-accent"
                  aria-label="Projeto salvo"
                >
                  <Bookmark className="size-4 fill-current" aria-hidden="true" />
                </span>
              ) : null}
            </div>
            <Badge className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate px-2 py-0.5 text-[11px]">
              {project.status}
            </Badge>
          </div>

          <div className="px-3 pb-2 pt-3">
            <h3 className="line-clamp-2 min-h-10 font-title text-base leading-5 tracking-tight">
              {project.title}
            </h3>
            <p className="mt-1 truncate text-xs text-muted">
              {project.carModel} - {project.year}
            </p>
            <p className="mt-1 truncate text-xs text-foreground/80">{project.engine}</p>
            <p className="mt-2 truncate text-xs font-semibold text-foreground">
              {project.ownerName}
            </p>
          </div>
        </Link>

        <div className="grid grid-cols-2 border-y border-border/60 text-xs text-muted">
          <span className="flex min-h-9 items-center gap-1.5 border-b border-r border-border/60 px-2">
            <Heart
              className={`size-3.5 text-accent ${project.viewerHasLiked ? "fill-current" : ""}`}
              aria-hidden="true"
            />
            <span aria-label={`${project.likes.toLocaleString("pt-BR")} curtidas`}>
              {project.likes.toLocaleString("pt-BR")}
            </span>
          </span>
          <span className="flex min-h-9 items-center gap-1.5 border-b border-border/60 px-2">
            <MessageSquare className="size-3.5 text-accent" aria-hidden="true" />
            <span aria-label={`${project.comments.toLocaleString("pt-BR")} comentarios`}>
              {project.comments.toLocaleString("pt-BR")}
            </span>
          </span>
          <span className="flex min-h-9 items-center gap-1.5 border-r border-border/60 px-2">
            <Eye className="size-3.5 text-accent" aria-hidden="true" />
            <span aria-label={`${project.views.toLocaleString("pt-BR")} visualizacoes`}>
              {project.views.toLocaleString("pt-BR")}
            </span>
          </span>
          <span className="flex min-h-9 items-center gap-1.5 px-2">
            <Bookmark className="size-3.5 text-accent" aria-hidden="true" />
            <span aria-label={`${project.saves.toLocaleString("pt-BR")} salvamentos`}>
              {project.saves.toLocaleString("pt-BR")}
            </span>
          </span>
        </div>

        <div className="grid grid-cols-[1fr_2.75rem] gap-1 p-2">
          <Link
            href={projectHref}
            className="inline-flex min-h-11 items-center justify-center rounded-3xl bg-accent px-3 text-xs font-semibold text-accent-foreground outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-accent"
          >
            Ver projeto
          </Link>
          <Link
            href={compareHref}
            aria-label={`Comparar ${project.title}`}
            className="inline-flex min-h-11 items-center justify-center rounded-3xl border border-border/70 text-muted outline-none transition hover:bg-background/45 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ArrowRightLeft className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="hidden md:block" data-project-card-layout="desktop">
      <Link href={projectHref} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-surface">
          <ProjectImage
            src={image}
            alt={`Foto do projeto ${project.title}`}
            fill
            loading={imageLoading}
            className="object-cover opacity-90 transition duration-300 group-hover:scale-105"
            sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 92vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
          <div className="absolute inset-x-4 top-4 flex flex-wrap gap-2">
            <Badge variant="secondary">{project.style}</Badge>
            <Badge>{project.status}</Badge>
            {source ? <Badge>{source}</Badge> : null}
          </div>
          <div className="absolute inset-x-4 bottom-4">
            <h3 className="font-title text-2xl tracking-tight">{project.title}</h3>
            <p className="mt-1 text-sm text-muted">
              {project.carModel} - {project.year}
            </p>
          </div>
        </div>
      </Link>

      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{project.ownerName}</p>
            <p className="mt-1 text-xs text-muted">{project.engine}</p>
            {location ? <p className="mt-1 text-xs text-muted">{location}</p> : null}
          </div>
          <div className="flex flex-col gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={projectHref}>Abrir</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href={compareHref}>
                <ArrowRightLeft className="size-4" />
                Comparar
              </Link>
            </Button>
          </div>
        </div>

        <p className="text-sm text-foreground/85">{project.shortDescription}</p>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-4">
          <div className="rounded-3xl border border-border/70 bg-background/25 px-3 py-2 text-center">
            <Heart className="mx-auto mb-1 size-4 text-accent" />
            {project.likes.toLocaleString("pt-BR")}
          </div>
          <div className="rounded-3xl border border-border/70 bg-background/25 px-3 py-2 text-center">
            <Eye className="mx-auto mb-1 size-4 text-accent" />
            {project.views.toLocaleString("pt-BR")}
          </div>
          <div className="rounded-3xl border border-border/70 bg-background/25 px-3 py-2 text-center">
            <Coins className="mx-auto mb-1 size-4 text-accent" />
            {formatProjectCurrency(project.totalInvested ?? project.estimatedCost)}
          </div>
          <div className="rounded-3xl border border-border/70 bg-background/25 px-3 py-2 text-center">
            <Wrench className="mx-auto mb-1 size-4 text-accent" />
            {project.modificationsCount
              ? `${project.modificationsCount} mods`
              : project.status}
          </div>
        </div>

        <div className="grid gap-2 rounded-3xl border border-border/70 bg-background/25 px-3 py-3 text-xs text-muted sm:grid-cols-2">
          <div>
            <p>Ultima evolucao</p>
            <p className="mt-1 font-semibold text-foreground">
              {formatProjectDate(project.lastUpdateAt)}
            </p>
          </div>
          <div>
            <p>Pecas instaladas</p>
            <p className="mt-1 font-semibold text-foreground">
              {project.installedParts.length.toLocaleString("pt-BR")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {project.tags.slice(0, 4).map((tag) => (
            <Link key={tag} href={buildSearchHref(tag)}>
              <Badge>{tag}</Badge>
            </Link>
          ))}
          {project.tags.length > 4 ? (
            <Badge variant="secondary">
              <TimerReset className="size-3" />
              +{project.tags.length - 4}
            </Badge>
          ) : null}
        </div>
      </div>
      </div>
    </PremiumCard>
  );
}
