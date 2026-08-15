import type { ReactNode } from "react";

import { ProjectCard } from "@/components/projects/project-card";
import type { Project } from "@/lib/projects/types";

export function ProjectGrid({
  projects,
  emptyTitle = "Nenhum projeto encontrado.",
  emptyDescription = "Ajuste os filtros ou adicione um projeto para ver novas fichas aqui.",
  emptyAction,
  eagerFirstImage = false,
}: {
  projects: Project[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  eagerFirstImage?: boolean;
}) {
  if (!projects.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-background/20 p-6 text-center sm:p-8">
        <h3 className="font-title text-xl tracking-tight">{emptyTitle}</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted">{emptyDescription}</p>
        {emptyAction ? <div className="mt-5">{emptyAction}</div> : null}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 gap-2.5 md:gap-5 xl:grid-cols-3"
      data-testid="project-grid"
    >
      {projects.map((project, index) => (
        <ProjectCard
          key={project.slug}
          project={project}
          imageLoading={eagerFirstImage && index === 0 ? "eager" : "lazy"}
        />
      ))}
    </div>
  );
}
