import type { CarCard, CarDetails } from "@/lib/supabase/queries";
import type { CarExpenseRow, CarPartRow } from "@/lib/types";

import type {
  Project,
  ProjectExpense,
  ProjectPart,
  ProjectUpdate,
} from "@/lib/projects/types";
import {
  buildProjectHref,
  createShortDescription,
  enrichProject,
  normalizeProjectTag,
  PROJECT_IMAGE_FALLBACK,
  uniqueStrings,
} from "@/lib/projects/utils";

function mapPart(part: CarPartRow): ProjectPart {
  return {
    id: part.id,
    name: part.name,
    category: part.category,
    brand: part.brand,
    description: part.description,
    status: part.status,
    priceEstimate: part.price_estimate ?? null,
    installedAt: part.installed_at ?? null,
    imageUrl: part.image_url ?? null,
    externalUrl: part.external_url ?? null,
  };
}

function mapExpense(expense: CarExpenseRow): ProjectExpense {
  return {
    id: expense.id,
    name: expense.name,
    category: expense.category,
    amount: expense.amount,
    date: expense.spent_at,
    note: expense.note,
    partName: expense.part_name,
    isPublic: expense.is_public,
  };
}

function mapUpdate(car: CarDetails): ProjectUpdate[] {
  return car.updates.map((update) => ({
    id: update.id,
    title: update.title,
    description: update.description?.trim() || "Atualização sem descrição adicional.",
    photo: update.photo_url,
    photos: uniqueStrings([update.photo_url, ...update.photo_urls]),
    category: update.category,
    date: update.happened_at,
    amount: update.amount_spent ?? null,
  }));
}

function deriveTags(input: {
  explicitTags?: string[] | null;
  brand: string | null;
  model: string | null;
  style: string;
  engine: string;
  state: string | null;
  fuelType?: string | null;
  drivetrain?: string | null;
}) {
  const tags = [
    ...(input.explicitTags ?? []).map((tag) => normalizeProjectTag(tag) || tag),
    input.brand,
    input.model,
    input.style,
    input.state,
    input.fuelType,
    input.drivetrain,
  ];

  const engine = input.engine.toLowerCase();
  if (engine.includes("turbo")) tags.push("Turbo");
  if (engine.includes("aspir")) tags.push("Aspirado");
  if (engine.includes("ap")) tags.push("AP");
  if (engine.includes("vtec")) tags.push("VTEC");
  if (engine.includes("boxer")) tags.push("Boxer");
  if (engine.includes("seis")) tags.push("6 cilindros");

  return uniqueStrings(tags.map((tag) => normalizeProjectTag(tag ?? "") || tag));
}

function deriveStatus(installedCount: number, plannedCount: number, isPublic: boolean) {
  if (!isPublic || (!installedCount && plannedCount > 0)) return "Planejamento";
  if (plannedCount > installedCount) return "Em andamento";
  if (plannedCount > 0) return "Quase pronto";
  if (installedCount > 0) return "Finalizado";
  return "Em andamento";
}

function createBaseProject(car: CarCard | CarDetails) {
  const description =
    car.description?.trim() ||
    `Projeto ${car.brand} ${car.model} montado para quem gosta de ficha completa, detalhes honestos e evolucao real.`;
  const carModel = [car.brand, car.model, car.version].filter(Boolean).join(" ");
  const tags = deriveTags({
    explicitTags: car.tags,
    brand: car.brand,
    model: car.model,
    style: car.category,
    engine: car.engine ?? car.version ?? "Preparacao em andamento",
    state: car.state,
    fuelType: car.fuel_type,
    drivetrain: car.drivetrain,
  });

  return enrichProject({
    id: car.id,
    slug: car.slug,
    source: "supabase" as const,
    databaseId: car.id,
    ownerId: car.owner_id,
    ownerName: car.owner?.display_name ?? "Membro Projeto Garagem",
    ownerUsername: car.owner?.username ?? null,
    ownerAvatarUrl: car.owner?.avatar_url ?? null,
    ownerBio: car.owner?.bio ?? null,
    ownerInstagram: car.owner?.instagram_handle ?? null,
    title: car.name,
    carModel,
    brand: car.brand,
    model: car.model,
    year: car.year,
    engine: car.engine ?? car.version ?? "Preparacao em andamento",
    style: car.category,
    shortDescription: createShortDescription(description, carModel),
    description,
    mainImage: car.main_photo_url || PROJECT_IMAGE_FALLBACK,
    gallery: uniqueStrings([
      car.main_photo_url,
      ...car.photo_urls,
      ...("photos" in car ? car.photos.map((photo) => photo.url) : []),
    ]),
    installedParts: [],
    plannedParts: [],
    estimatedCost:
      "parts" in car
        ? car.parts.reduce((sum, part) => sum + Math.max(0, part.price_estimate ?? 0), 0)
        : car.estimated_cost,
    totalInvested: car.total_invested,
    status: car.project_status ?? deriveStatus(
      car.installed_parts_count,
      car.planned_parts_count,
      car.is_public
    ),
    progressPercent: car.progress_percent,
    likes: car.likes_count,
    saves: car.saves_count,
    views: car.views_count,
    comments: car.comments_count,
    tags,
    mileageKm: car.mileage_km,
    powerCv: car.power_cv,
    torqueNm: car.torque_nm,
    weightKg: car.weight_kg,
    startedAt: car.started_at,
    projectGoal: car.project_goal,
    lastUpdateAt: car.last_update_at,
    updatesCount: car.updates_count,
    modificationsCount: car.installed_parts_count + car.planned_parts_count,
    city: car.city,
    state: car.state,
    createdAt: car.created_at,
    updatedAt: car.updated_at,
    isPublic: car.is_public,
    showExpensesPublic: car.show_expenses_public,
    specConfidencePercent: car.spec_confidence_percent,
    viewerHasLiked: car.viewer_has_liked,
    viewerHasSaved: car.viewer_has_saved,
    editHref: buildProjectHref(car.slug) + "/editar",
  });
}

export function mapCarCardToProject(car: CarCard): Project {
  return {
    ...createBaseProject(car),
    installedParts: [],
    plannedParts: [],
  };
}

export function mapCarDetailsToProject(car: CarDetails): Project {
  const installedParts = car.parts.filter((part) => part.status === "installed").map(mapPart);
  const plannedParts = car.parts.filter((part) => part.status === "planned").map(mapPart);
  const removedParts = car.parts.filter((part) => part.status === "removed").map(mapPart);

  return enrichProject({
    ...createBaseProject(car),
    installedParts,
    plannedParts,
    removedParts,
    updates: mapUpdate(car),
    expenses: car.expenses.map(mapExpense),
    gallery: uniqueStrings([
      car.main_photo_url,
      ...car.photos.map((photo) => photo.url),
      ...car.photo_urls,
    ]),
    estimatedCost: [...installedParts, ...plannedParts].reduce(
      (sum, part) => sum + Math.max(0, part.priceEstimate ?? 0),
      0
    ),
    status: car.project_status ?? deriveStatus(installedParts.length, plannedParts.length, car.is_public),
    totalInvested: car.total_invested,
  });
}
