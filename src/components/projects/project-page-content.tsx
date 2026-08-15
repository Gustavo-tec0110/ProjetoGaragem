import { Suspense } from "react";

import { LocalProjectResolver } from "@/components/projects/local-project-resolver";
import { ProjectDetail, ProjectDetailBodySkeleton } from "@/components/projects/project-detail";
import { mapCarDetailsToProject } from "@/lib/projects/mappers";
import { getProjectCriticalData, getProjectPageData } from "@/lib/projects/server";
import { getSupabaseServerUser } from "@/lib/supabase/auth-server";

type ProjectPageData = Awaited<ReturnType<typeof getProjectPageData>>;
type ServerUser = Awaited<ReturnType<typeof getSupabaseServerUser>>;

function technicalSpecs(detail: NonNullable<ProjectPageData["detail"]>) {
  return [
    { label: "Marca", value: detail.brand },
    { label: "Modelo", value: detail.model },
    { label: "Ano", value: detail.year },
    { label: "Versão", value: detail.version },
    { label: "Motor atual", value: detail.engine },
    { label: "Alimentação atual", value: detail.current_induction },
    { label: "Potência atual", value: detail.power_cv ? `${detail.power_cv} cv` : null },
    { label: "Combustível", value: detail.fuel_type },
    { label: "Câmbio atual", value: detail.transmission },
    { label: "Tração atual", value: detail.drivetrain },
    { label: "Suspensão", value: detail.suspension },
    { label: "Rodas", value: detail.wheels },
    { label: "Pneus", value: detail.tires },
    { label: "Freios", value: detail.brakes },
    { label: "Categoria", value: detail.category },
  ];
}

async function ProjectPageSecondaryContent({
  dataPromise,
  userPromise,
}: {
  dataPromise: Promise<ProjectPageData>;
  userPromise: Promise<ServerUser>;
}) {
  const [{ project, detail, similarProjects, recommendations }, user] = await Promise.all([
    dataPromise,
    userPromise,
  ]);

  if (!project) return null;

  if (detail) {
    return (
      <ProjectDetail
        project={mapCarDetailsToProject(detail)}
        similarProjects={similarProjects}
        recommendations={recommendations}
        viewerLoggedIn={Boolean(user)}
        canEdit={user?.id === detail.owner_id}
        technicalSpecs={technicalSpecs(detail)}
        renderMode="body"
        commentThread={{
          carId: detail.id,
          slug: detail.slug,
          ownerId: detail.owner_id,
          viewerId: user?.id ?? null,
          viewerLoggedIn: Boolean(user),
          comments: detail.comments,
        }}
      />
    );
  }

  return (
    <ProjectDetail
      project={project}
      similarProjects={similarProjects}
      recommendations={recommendations}
      viewerLoggedIn={Boolean(user)}
      canEdit={false}
      renderMode="body"
    />
  );
}

export async function ProjectPageContent({ slug }: { slug: string }) {
  const dataPromise = getProjectPageData(slug);
  const userPromise = getSupabaseServerUser();
  const criticalProject = await getProjectCriticalData(slug);

  if (!criticalProject) {
    const [{ project, detail, similarProjects, recommendations }, user] = await Promise.all([
      dataPromise,
      userPromise,
    ]);
    if (!project) {
      return <LocalProjectResolver slug={slug} viewerLoggedIn={Boolean(user)} />;
    }
    return (
      <ProjectDetail
        project={detail ? mapCarDetailsToProject(detail) : project}
        similarProjects={similarProjects}
        recommendations={recommendations}
        viewerLoggedIn={Boolean(user)}
        canEdit={Boolean(detail && user?.id === detail.owner_id)}
        technicalSpecs={detail ? technicalSpecs(detail) : undefined}
        commentThread={detail ? {
          carId: detail.id,
          slug: detail.slug,
          ownerId: detail.owner_id,
          viewerId: user?.id ?? null,
          viewerLoggedIn: Boolean(user),
          comments: detail.comments,
        } : null}
      />
    );
  }

  return (
    <>
      <ProjectDetail
        project={criticalProject}
        similarProjects={[]}
        viewerLoggedIn={false}
        canEdit={false}
        renderMode="hero"
      />
      <Suspense fallback={<ProjectDetailBodySkeleton />}>
        <ProjectPageSecondaryContent dataPromise={dataPromise} userPromise={userPromise} />
      </Suspense>
    </>
  );
}
