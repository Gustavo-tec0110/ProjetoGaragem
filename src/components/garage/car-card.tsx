import type { ReactNode } from "react";

import { ProjectCard } from "@/components/projects/project-card";
import { ProjectGrid } from "@/components/projects/project-grid";
import { mapCarCardToProject } from "@/lib/projects/mappers";
import type { CarCard as CarCardData } from "@/lib/supabase/queries";

export function CarCard({ car }: { car: CarCardData }) {
  return <ProjectCard project={mapCarCardToProject(car)} />;
}

export function CarGrid({
  cars,
  emptyTitle = "Nenhum carro encontrado.",
  emptyDescription,
  emptyAction,
}: {
  cars: CarCardData[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}) {
  return (
    <ProjectGrid
      projects={cars.map(mapCarCardToProject)}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      emptyAction={emptyAction}
    />
  );
}
