import type { Project, ProjectPart } from "../projects/types";
import type { ProjectModification } from "./types";

// Only public fields enter the overview. Paid values have already passed the owner/RPC projection.
export function withCatalogModifications(project: Project, modifications: ProjectModification[]): Project {
  const seen = new Set<string>();
  const parts = modifications.flatMap((item): ProjectPart[] => {
    if (seen.has(item.id)) return [];
    seen.add(item.id);
    return [{
      id: `catalog-${item.id}`, name: item.catalog.name, category: item.catalog.category.name,
      status: item.status === "wishlist" ? "planned" : item.status,
      wishlist: item.status === "wishlist", description: item.public_description,
      imageUrl: item.project_photo_url || item.catalog.default_image_path,
      installedAt: item.installed_at, priceEstimate: null, paidAmount: item.paid_amount,
      catalog: item.catalog,
    }];
  });
  // Legacy parts have no catalog foreign key. Keep their independent records; never guess matches by name.
  const installedParts = [...parts.filter((item) => item.status === "installed"), ...project.installedParts];
  const plannedParts = [...parts.filter((item) => item.status === "planned"), ...project.plannedParts];
  const removedParts = [...parts.filter((item) => item.status === "removed"), ...project.removedParts];
  return { ...project, installedParts, plannedParts, removedParts,
    modificationsCount: installedParts.length + plannedParts.length + removedParts.length };
}
