import type { ReactNode } from "react";

import { ProjectCard } from "@/components/projects/project-card";
import type { Project } from "@/lib/projects/types";

export function ProjectGrid({
  projects,
  emptyTitle = "Nenhum projeto encontrado.",
  emptyDescription = "Ajuste os filtros ou adicione um carro para ver novas fichas aqui.",
  emptyAction,
}: {
  projects: Project[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}) {
  if (!projects.length) {
    return (
      <div className="rounded-4xl border border-border/70 bg-background/25 p-6 text-center">
        <h3 className="font-title text-xl tracking-tight">{emptyTitle}</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted">{emptyDescription}</p>
        {emptyAction ? <div className="mt-5">{emptyAction}</div> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.slug} project={project} />
      ))}
    </div>
  );
}
