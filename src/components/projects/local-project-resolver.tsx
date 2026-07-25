"use client";

import * as React from "react";

import { ProjectDetail } from "@/components/projects/project-detail";
import { ProjectNotFound } from "@/components/projects/project-not-found";
import { demoProjects } from "@/lib/projects/demo-projects";
import {
  getEmptyLocalProjectsSnapshot,
  getLocalProjects,
  subscribeLocalProjects,
} from "@/lib/projects/local-storage";
import type { Project } from "@/lib/projects/types";
import { getSimilarProjects, uniqueProjects } from "@/lib/projects/utils";

export function LocalProjectResolver({
  slug,
  viewerLoggedIn,
}: {
  slug: string;
  viewerLoggedIn: boolean;
}) {
  const localProjects = React.useSyncExternalStore<Project[]>(
    subscribeLocalProjects,
    getLocalProjects,
    getEmptyLocalProjectsSnapshot
  );
  const project = React.useMemo(
    () => localProjects.find((item) => item.slug === slug) ?? null,
    [localProjects, slug]
  );
  const similarProjects = React.useMemo(() => {
    if (!project) return [];
    return getSimilarProjects(
      uniqueProjects([...localProjects, ...demoProjects]),
      project,
      3
    );
  }, [localProjects, project]);

  if (!project) {
    return <ProjectNotFound />;
  }

  return (
    <ProjectDetail
      project={project}
      similarProjects={similarProjects}
      viewerLoggedIn={viewerLoggedIn}
    />
  );
}
