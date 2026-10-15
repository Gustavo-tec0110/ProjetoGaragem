import { notFound } from "next/navigation";

import { ProjectModifications } from "@/components/projects/project-modifications";
import type { ModificationCatalogItem, ProjectModification } from "@/lib/modifications/types";
import type { ModificationCategoryRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const id = "48db0602-a04d-47bf-8f8d-304d51210321";
const date = "2026-10-13T12:00:00Z";
const category: ModificationCategoryRow = {
  id, parent_id: null, slug: "motor", name: "Motor", sort_order: 1,
  is_active: true, created_at: date, updated_at: date,
};
const catalog: ModificationCatalogItem = {
  id, category_id: id, slug: "turbo", name: "Turbo", short_description: null,
  default_image_path: null, estimated_price_min: null, estimated_price_max: null,
  compatibility_type: "universal", compatibility_notes: null, is_active: true,
  created_at: date, updated_at: date, category,
};
const modification: ProjectModification = {
  id, car_id: id, catalog_id: id, status: "installed", paid_amount: null,
  note: null, public_description: null, show_paid_amount: false,
  project_photo_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E",
  project_photo_storage_path: `${id}/modifications/90b48504-6830-4691-b957-71730e2eaa38.webp`,
  installed_at: null, created_at: date, updated_at: date, catalog,
};

export default function ModificationPhotosTestPage() {
  if (process.env.MODIFICATION_PHOTOS_TEST_HARNESS !== "1") notFound();
  return <div className="pt-24"><ProjectModifications
    carId={id}
    projectName="Projeto de teste"
    projectHref="/"
    canEdit
    categories={[category]}
    catalog={[catalog]}
    modifications={[modification]}
  /></div>;
}
