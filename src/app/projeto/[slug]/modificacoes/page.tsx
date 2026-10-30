import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectModifications } from "@/components/projects/project-modifications";
import { getProjectModificationData } from "@/lib/modifications/server";
import { getProjectSummary } from "@/lib/projects/server";
import { createSeoMetadata } from "@/lib/seo";
import { getSupabaseServerUser } from "@/lib/supabase/auth-server";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectSummary(slug);
  if (!project) {
    return createSeoMetadata({
      title: "Projeto não encontrado",
      description: "A página de modificações deste projeto não foi encontrada.",
      path: `/projeto/${slug}/modificacoes`,
      noIndex: true,
    });
  }
  return createSeoMetadata({
    title: `Modificações · ${project.title}`,
    description: `Modificações e planos do projeto ${project.title}.`,
    path: `/projeto/${slug}/modificacoes`,
    noIndex: !project.isPublic,
  });
}

export default async function ProjectModificationsPage({ params }: PageProps) {
  const { slug } = await params;
  const [project, user] = await Promise.all([getProjectSummary(slug), getSupabaseServerUser()]);
  if (!project) notFound();
  const isOwner = Boolean(user && project.ownerId === user.id);

  const modifications = project.databaseId
    ? getProjectModificationData(project.databaseId, isOwner)
    : Promise.resolve({ categories: [], catalog: [], modifications: [] });

  return (
    <ProjectModifications
      carId={project.databaseId}
      projectName={project.title}
      projectHref={`/projeto/${project.slug}`}
      canEdit={isOwner}
      {...await modifications}
    />
  );
}
