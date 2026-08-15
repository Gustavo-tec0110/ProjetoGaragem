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
  imageIndex = 0,
}: {
  project: Project;
  imageLoading?: "eager" | "lazy";
  imageIndex?: number;
}) {
  const projectHref = buildProjectHref(project.slug);
  const compareHref = buildCompareHref(project.slug);
  const image = project.gallery[imageIndex] ?? project.gallery[0] ?? project.mainImage;
  const location = [project.city, project.state].filter(Boolean).join(", ");
  const source = sourceLabel(project);

  return (
    <PremiumCard
      className="group overflow-hidden rounded-2xl"
      data-testid="project-card"
      data-project-card-layout="responsive"
    >
      <Link
        href={projectHref}
        className="relative block rounded-t-2xl outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-surface">
          <ProjectImage
            src={image}
            alt={`Foto do projeto ${project.title}`}
            fill
            loading={imageLoading}
            className="object-cover opacity-90 transition duration-300 md:group-hover:scale-105"
            sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 46vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25 md:from-black/90 md:via-black/35 md:to-transparent" />
          <Badge className="absolute left-2 top-2 max-w-[70%] truncate px-2 py-0.5 text-[11px] md:left-4 md:top-4 md:max-w-none md:px-2.5 md:py-1">
            {project.style}
          </Badge>
          <Badge className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate px-2 py-0.5 text-[11px] md:bottom-auto md:left-28 md:top-4 md:max-w-none md:px-2.5 md:py-1">
            {project.status}
          </Badge>
          {source ? <Badge className="absolute left-56 top-4 hidden md:inline-flex">{source}</Badge> : null}
          {project.viewerHasSaved ? (
            <span
              className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full border border-white/15 bg-black/55 text-accent md:hidden"
              aria-label="Projeto salvo"
            >
              <Bookmark className="size-4 fill-current" aria-hidden="true" />
            </span>
          ) : null}
        </div>

        <div className="px-3 pb-2 pt-3 md:absolute md:inset-x-4 md:bottom-4 md:p-0">
          <h3 className="line-clamp-2 min-h-10 font-title text-base leading-5 tracking-tight md:min-h-0 md:text-2xl md:leading-tight">
            {project.title}
          </h3>
          <p className="mt-1 truncate text-xs text-muted md:text-sm">
            {project.carModel} - {project.year}
          </p>
          <p className="mt-1 truncate text-xs text-foreground/80 md:hidden">{project.engine}</p>
        </div>
      </Link>

      <div className="grid px-3 pb-2 md:grid-cols-[1fr_auto] md:gap-x-3 md:p-5">
        <div className="min-w-0 py-1 md:py-0">
          <p className="truncate text-xs font-semibold text-foreground md:text-sm">{project.ownerName}</p>
          <p className="mt-1 hidden text-xs text-muted md:block">{project.engine}</p>
          {location ? <p className="mt-1 hidden text-xs text-muted md:block">{location}</p> : null}
        </div>

        <div className="order-last grid grid-cols-[1fr_2.75rem] gap-1 pt-2 md:order-none md:flex md:gap-2 md:pt-0">
          <Link
            href={projectHref}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-3 text-xs font-semibold text-white outline-none transition hover:brightness-105 focus-visible:ring-2 focus-visible:ring-accent md:min-h-9 md:border md:border-border/70 md:bg-transparent md:text-foreground md:hover:bg-background/45"
          >
            <span className="md:hidden">Ver projeto</span>
            <span className="hidden md:inline">Abrir</span>
          </Link>
          <Link
            href={compareHref}
            aria-label={`Comparar ${project.title}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border/70 text-muted outline-none transition hover:bg-background/45 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent md:min-h-9 md:px-3"
          >
            <ArrowRightLeft className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <p className="col-span-full mt-4 hidden text-sm text-foreground/85 md:block">{project.shortDescription}</p>

        <div className="col-span-full mt-2 grid grid-cols-2 border-y border-border/50 text-xs text-muted md:mt-4 md:grid-cols-4 md:py-3">
          <span className="flex min-h-9 items-center gap-1.5 border-b border-r border-border/50 px-2 md:block md:min-h-0 md:border-0 md:text-center">
            <Heart className={`size-3.5 text-accent md:mx-auto md:mb-1 md:size-4 ${project.viewerHasLiked ? "fill-current" : ""}`} aria-hidden="true" />
            <span aria-label={`${project.likes.toLocaleString("pt-BR")} curtidas`}>{project.likes.toLocaleString("pt-BR")}</span>
          </span>
          <span className="flex min-h-9 items-center gap-1.5 border-b border-border/50 px-2 md:hidden">
            <MessageSquare className="size-3.5 text-accent" aria-hidden="true" />
            <span aria-label={`${project.comments.toLocaleString("pt-BR")} comentarios`}>{project.comments.toLocaleString("pt-BR")}</span>
          </span>
          <span className="flex min-h-9 items-center gap-1.5 border-r border-border/50 px-2 md:block md:min-h-0 md:border-l md:border-r-0 md:text-center">
            <Eye className="size-3.5 text-accent md:mx-auto md:mb-1 md:size-4" aria-hidden="true" />
            <span aria-label={`${project.views.toLocaleString("pt-BR")} visualizacoes`}>{project.views.toLocaleString("pt-BR")}</span>
          </span>
          <span className="flex min-h-9 items-center gap-1.5 px-2 md:hidden">
            <Bookmark className="size-3.5 text-accent" aria-hidden="true" />
            <span aria-label={`${project.saves.toLocaleString("pt-BR")} salvamentos`}>{project.saves.toLocaleString("pt-BR")}</span>
          </span>
          <span className="hidden border-l border-border/55 text-center md:block">
            <Coins className="mx-auto mb-1 size-4 text-accent" aria-hidden="true" />
            {formatProjectCurrency(project.totalInvested ?? project.estimatedCost)}
          </span>
          <span className="hidden border-l border-border/55 text-center md:block">
            <Wrench className="mx-auto mb-1 size-4 text-accent" aria-hidden="true" />
            {project.modificationsCount ? `${project.modificationsCount} mods` : project.status}
          </span>
        </div>

        <div className="col-span-full mt-4 hidden gap-2 text-xs text-muted md:grid md:grid-cols-2">
          <div>
            <p>Ultima evolucao</p>
            <p className="mt-1 font-semibold text-foreground">{formatProjectDate(project.lastUpdateAt)}</p>
          </div>
          <div>
            <p>Pecas instaladas</p>
            <p className="mt-1 font-semibold text-foreground">{project.modificationsCount.toLocaleString("pt-BR")}</p>
          </div>
        </div>

        <div className="col-span-full mt-4 hidden flex-wrap gap-2 md:flex">
          {project.tags.slice(0, 4).map((tag) => (
            <Link key={tag} href={buildSearchHref(tag)} prefetch={false}><Badge>{tag}</Badge></Link>
          ))}
          {project.tags.length > 4 ? (
            <Badge variant="secondary"><TimerReset className="size-3" />+{project.tags.length - 4}</Badge>
          ) : null}
        </div>
      </div>
    </PremiumCard>
  );
}
