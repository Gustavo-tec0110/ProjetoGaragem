import { LocalProjectResolver } from "@/components/projects/local-project-resolver";
import { ProjectDetail } from "@/components/projects/project-detail";
import { mapCarDetailsToProject } from "@/lib/projects/mappers";
import { getProjectPageData } from "@/lib/projects/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type RouteVariant = "car" | "project";

function buildAlternateRoute(slug: string, routeVariant: RouteVariant) {
  if (routeVariant === "car") {
    return {
      href: `/projeto/${slug}`,
      label: "Abrir rota nova",
    };
  }

  return {
    href: `/carros/${slug}`,
    label: "Abrir rota legado",
  };
}

export async function ProjectPageContent({
  slug,
  routeVariant,
}: {
  slug: string;
  routeVariant: RouteVariant;
}) {
  const [{ project, detail, similarProjects }, supabase] = await Promise.all([
    getProjectPageData(slug),
    getSupabaseServerClient(),
  ]);

  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!project) {
    return <LocalProjectResolver slug={slug} viewerLoggedIn={Boolean(user)} />;
  }

  if (detail) {
    const mappedProject = mapCarDetailsToProject(detail);
    return (
      <ProjectDetail
        project={mappedProject}
        similarProjects={similarProjects}
        viewerLoggedIn={Boolean(user)}
        technicalSpecs={[
          { label: "Marca", value: detail.brand },
          { label: "Modelo", value: detail.model },
          { label: "Ano", value: detail.year },
          { label: "Versao", value: detail.version },
          { label: "Motor", value: detail.engine },
          { label: "Potencia", value: detail.power_cv ? `${detail.power_cv} cv` : null },
          { label: "Combustivel", value: detail.fuel_type },
          { label: "Cambio", value: detail.transmission },
          { label: "Tracao", value: detail.drivetrain },
          { label: "Suspensao", value: detail.suspension },
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
        alternateRoute={buildAlternateRoute(detail.slug, routeVariant)}
      />
    );
  }

  return (
    <ProjectDetail
      project={project}
      similarProjects={similarProjects}
      viewerLoggedIn={Boolean(user)}
      alternateRoute={buildAlternateRoute(project.slug, routeVariant)}
    />
  );
}
