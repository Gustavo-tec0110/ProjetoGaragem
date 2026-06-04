import Link from "next/link";
import {
  ArrowRightLeft,
  Coins,
  Eye,
  Heart,
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

export function ProjectCard({ project }: { project: Project }) {
  const projectHref = buildProjectHref(project.slug);
  const compareHref = buildCompareHref(project.slug);
  const image = project.gallery[0] ?? project.mainImage;
  const location = [project.city, project.state].filter(Boolean).join(", ");
  const source = sourceLabel(project);

  return (
    <PremiumCard className="group overflow-hidden">
      <Link href={projectHref} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-surface">
          <ProjectImage
            src={image}
            alt={`Foto do projeto ${project.title}`}
            fill
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
    </PremiumCard>
  );
}
