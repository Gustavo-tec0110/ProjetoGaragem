"use client";

import * as React from "react";
import Link from "next/link";

import { ProjectGrid } from "@/components/projects/project-grid";
import { Button } from "@/components/ui/button";
import {
  getLocalProjects,
  subscribeLocalProjects,
} from "@/lib/projects/local-storage";
import type { Project } from "@/lib/projects/types";

export function LocalGaragePanel() {
  const projects = React.useSyncExternalStore<Project[]>(
    subscribeLocalProjects,
    getLocalProjects,
    () => []
  );

  return (
    <ProjectGrid
      projects={projects}
      emptyTitle="Sua garagem local ainda esta vazia."
      emptyDescription="Crie um projeto em modo demo para testar cadastro, pagina individual e compartilhamento sem depender do banco."
      emptyAction={
        <Button asChild>
          <Link href="/criar-projeto">Adicionar projeto local</Link>
        </Button>
      }
    />
  );
}
