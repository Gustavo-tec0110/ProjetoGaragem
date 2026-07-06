import type { Metadata } from "next";

import { ProjectPageContent } from "@/components/projects/project-page-content";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { getProjectRouteMetadata } from "@/lib/projects/server";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return getProjectRouteMetadata(
    slug,
    "project",
    "Projeto nao encontrado",
    "A ficha publica deste projeto nao foi encontrada."
  );
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1">
        <ProjectPageContent slug={slug} />
      </main>
      <SiteFooter />
    </div>
  );
}
