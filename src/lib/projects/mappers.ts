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

function safeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function safeRows<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

function safeText(value: string | null | undefined, fallback: string) {
  const text = value?.trim();
  return text ? text : fallback;
}

function safeNumber(value: number | null | undefined, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

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
  return safeRows(car.updates).map((update) => ({
    id: update.id,
    title: safeText(update.title, "Atualizacao do projeto"),
    description: update.description?.trim() || "Atualização sem descrição adicional.",
    photo: update.photo_url,
    photos: uniqueStrings([update.photo_url, ...safeStringArray(update.photo_urls)]),
    category: safeText(update.category, "outro"),
    date: update.happened_at ?? car.updated_at ?? car.created_at,
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
  const title = safeText(car.name, `${safeText(car.brand, "Projeto")} ${safeText(car.model, "automotivo")}`);
  const brand = safeText(car.brand, "Marca nao informada");
  const model = safeText(car.model, "Modelo nao informado");
  const category = safeText(car.category, "Projeto automotivo");
  const engine = safeText(car.engine ?? car.version, "Preparacao em andamento");
  const createdAt = car.created_at ?? new Date().toISOString();
  const updatedAt = car.updated_at ?? createdAt;
  const photos = "photos" in car ? safeRows(car.photos) : [];
  const parts = "parts" in car ? safeRows(car.parts) : [];
  const description =
    car.description?.trim() ||
    `Projeto ${brand} ${model} montado para quem gosta de ficha completa, detalhes honestos e evolucao real.`;
  const carModel = [brand, model, car.version].filter(Boolean).join(" ");
  const tags = deriveTags({
    explicitTags: car.tags,
    brand,
    model,
    style: category,
    engine,
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
    title,
    carModel,
    brand,
    model,
    year: safeNumber(car.year, new Date(createdAt).getFullYear()),
    engine,
    style: category,
    shortDescription: createShortDescription(description, carModel),
    description,
    mainImage: car.main_photo_url || PROJECT_IMAGE_FALLBACK,
    gallery: uniqueStrings([
      car.main_photo_url,
      ...safeStringArray(car.photo_urls),
      ...photos.map((photo) => photo.url),
    ]),
    installedParts: [],
    plannedParts: [],
    estimatedCost:
      "parts" in car
        ? parts.reduce((sum, part) => sum + Math.max(0, part.price_estimate ?? 0), 0)
        : car.estimated_cost,
    totalInvested: car.total_invested,
    status: car.project_status ?? deriveStatus(
      safeNumber(car.installed_parts_count),
      safeNumber(car.planned_parts_count),
      car.is_public ?? true
    ),
    progressPercent: car.progress_percent,
    likes: safeNumber(car.likes_count),
    saves: safeNumber(car.saves_count),
    views: safeNumber(car.views_count),
    comments: safeNumber(car.comments_count),
    followers: safeNumber(car.project_followers_count),
    tags,
    mileageKm: car.mileage_km,
    powerCv: car.power_cv,
    torqueNm: car.torque_nm,
    weightKg: car.weight_kg,
    startedAt: car.started_at,
    projectGoal: car.project_goal,
    lastUpdateAt: car.last_update_at,
    updatesCount: safeNumber(car.updates_count),
    modificationsCount: safeNumber(car.installed_parts_count) + safeNumber(car.planned_parts_count),
    city: car.city,
    state: car.state,
    createdAt,
    updatedAt,
    isPublic: car.is_public ?? true,
    showExpensesPublic: car.show_expenses_public ?? false,
    specConfidencePercent: car.spec_confidence_percent,
    currentInduction: car.current_induction,
    factoryEngine: car.factory_engine,
    factoryInduction: car.factory_induction,
    factoryPowerCv: car.factory_power_cv,
    factoryTransmission: car.factory_transmission,
    factoryDrivetrain: car.factory_drivetrain,
    factorySpecsNote: car.factory_specs_note,
    viewerHasLiked: car.viewer_has_liked,
    viewerHasSaved: car.viewer_has_saved,
    viewerHasFollowed: car.viewer_has_followed,
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
  const parts = safeRows(car.parts);
  const photos = safeRows(car.photos);
  const expenses = safeRows(car.expenses);
  const installedParts = parts.filter((part) => part.status === "installed").map(mapPart);
  const plannedParts = parts.filter((part) => part.status === "planned").map(mapPart);
  const removedParts = parts.filter((part) => part.status === "removed").map(mapPart);

  return enrichProject({
    ...createBaseProject(car),
    installedParts,
    plannedParts,
    removedParts,
    updates: mapUpdate(car),
    expenses: expenses.map(mapExpense),
    gallery: uniqueStrings([
      car.main_photo_url,
      ...photos.map((photo) => photo.url),
      ...safeStringArray(car.photo_urls),
    ]),
    estimatedCost: [...installedParts, ...plannedParts].reduce(
      (sum, part) => sum + Math.max(0, part.priceEstimate ?? 0),
      0
    ),
    status: car.project_status ?? deriveStatus(installedParts.length, plannedParts.length, car.is_public ?? true),
    totalInvested: car.total_invested,
  });
}
