import { LocalProjectResolver } from "@/components/projects/local-project-resolver";
import { ProjectDetail } from "@/components/projects/project-detail";
import { mapCarDetailsToProject } from "@/lib/projects/mappers";
import { getProjectPageData } from "@/lib/projects/server";
import { getSupabaseServerUser } from "@/lib/supabase/auth-server";

export async function ProjectPageContent({
  slug,
}: {
  slug: string;
}) {
  const [{ project, detail, similarProjects, recommendations }, user] = await Promise.all([
    getProjectPageData(slug),
    getSupabaseServerUser(),
  ]);

  if (!project) {
    return <LocalProjectResolver slug={slug} viewerLoggedIn={Boolean(user)} />;
  }

  if (detail) {
    const mappedProject = mapCarDetailsToProject(detail);
    const canEdit = user?.id === detail.owner_id;
    return (
      <ProjectDetail
        project={mappedProject}
        similarProjects={similarProjects}
        recommendations={recommendations}
        viewerLoggedIn={Boolean(user)}
        canEdit={canEdit}
        technicalSpecs={[
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
        ]}
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
    />
  );
}
