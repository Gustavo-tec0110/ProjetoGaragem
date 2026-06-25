import "server-only";

import { revalidatePath } from "next/cache";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { calculateSpecConfidence, type DataConfidence, type DetailAnswer } from "@/lib/car-catalog";
import { normalizeSlug } from "@/lib/garage/constants";
import { calculateEssentialProjectProgress } from "@/lib/garage/project-completion";
import { parseTagString } from "@/lib/projects/utils";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { CarPartStatus } from "@/lib/types";
import type { Database } from "@/types/supabase";

type ServerSupabaseClient = SupabaseClient<Database>;

type PartInput = {
  id?: string;
  name: string;
  category: string;
  brand?: string;
  description?: string;
  status: CarPartStatus;
  priority?: string;
  price_estimate?: number | null;
  external_url?: string;
  affiliate_url?: string;
  store_name?: string;
  product_id?: string;
  installed_at?: string;
  image_url?: string;
};

type UpdateInput = {
  title: string;
  description?: string;
  photo_url?: string;
  photo_urls?: string[];
  category?: string;
  happened_at: string;
  amount_spent?: number | null;
};

type ExpenseInput = {
  name: string;
  category: string;
  amount: number;
  spent_at: string;
  note?: string;
  part_name?: string;
  is_public?: boolean;
};

export type CreateCarProjectResult =
  | {
      ok: true;
      slug: string;
      redirectTo: string;
    }
  | {
      ok: false;
      message: string;
      status: number;
    };

export type UpdateCarProjectResult = CreateCarProjectResult;

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? value : null;
}

function uuidText(formData: FormData, key: string) {
  const value = text(formData, key);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function dataConfidence(formData: FormData, key: string, fallback: DataConfidence): DataConfidence {
  const value = text(formData, key);
  return value === "confirmed" || value === "estimated" || value === "unknown" ? value : fallback;
}

function detailAnswer(formData: FormData, key: string): DetailAnswer {
  const value = text(formData, key);
  return value === "yes" || value === "no" || value === "unknown" ? value : "unknown";
}

function integer(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;
  const parsed = Number.parseInt(value.replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseStringArray(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  } catch {
    return [];
  }
}

function parseParts(raw: string): PartInput[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => {
        const status: CarPartStatus =
          item.status === "planned"
            ? "planned"
            : item.status === "removed"
              ? "removed"
              : "installed";
        const price =
          typeof item.price_estimate === "number"
            ? item.price_estimate
            : typeof item.price_estimate === "string" && item.price_estimate.trim()
              ? Number.parseInt(item.price_estimate.replace(/[^\d-]/g, ""), 10)
              : null;

        return {
          id: typeof item.id === "string" ? item.id : undefined,
          name: typeof item.name === "string" ? item.name.trim() : "",
          category: typeof item.category === "string" ? item.category.trim() : "Outros",
          brand: typeof item.brand === "string" ? item.brand.trim() : "",
          description: typeof item.description === "string" ? item.description.trim() : "",
          status,
          priority: typeof item.priority === "string" ? item.priority.trim() : "",
          price_estimate: Number.isFinite(price) ? price : null,
          external_url: typeof item.external_url === "string" ? item.external_url.trim() : "",
          affiliate_url: typeof item.affiliate_url === "string" ? item.affiliate_url.trim() : "",
          store_name: typeof item.store_name === "string" ? item.store_name.trim() : "",
          product_id: typeof item.product_id === "string" ? item.product_id.trim() : "",
          installed_at: typeof item.installed_at === "string" ? item.installed_at.trim() : "",
          image_url: typeof item.image_url === "string" ? item.image_url.trim() : "",
        };
      })
      .filter((part) => part.name.length > 0);
  } catch {
    return [];
  }
}

function parseUpdates(raw: string): UpdateInput[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => {
        const amount =
          typeof item.amount_spent === "number"
            ? item.amount_spent
            : typeof item.amount_spent === "string" && item.amount_spent.trim()
              ? Number.parseInt(item.amount_spent.replace(/[^\d-]/g, ""), 10)
              : null;

        return {
          title: typeof item.title === "string" ? item.title.trim() : "",
          description: typeof item.description === "string" ? item.description.trim() : "",
          photo_url: typeof item.photo_url === "string" ? item.photo_url.trim() : "",
          photo_urls: Array.isArray(item.photo_urls)
            ? item.photo_urls.filter((url): url is string => typeof url === "string" && url.trim().length > 0)
            : [],
          category: typeof item.category === "string" ? item.category.trim() : "outro",
          happened_at:
            typeof item.happened_at === "string" && item.happened_at.trim()
              ? item.happened_at
              : new Date().toISOString().slice(0, 10),
          amount_spent: Number.isFinite(amount) ? amount : null,
        };
      })
      .filter((update) => update.title.length > 0);
  } catch {
    return [];
  }
}

function parseExpenses(raw: string): ExpenseInput[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => {
        const amount =
          typeof item.amount === "number"
            ? item.amount
            : typeof item.amount === "string" && item.amount.trim()
              ? Number.parseInt(item.amount.replace(/[^\d-]/g, ""), 10)
              : null;

        return {
          name: typeof item.name === "string" ? item.name.trim() : "",
          category: typeof item.category === "string" ? item.category.trim() : "Outros",
          amount: Number.isFinite(amount) ? Math.max(0, amount ?? 0) : 0,
          spent_at:
            typeof item.spent_at === "string" && item.spent_at.trim()
              ? item.spent_at
              : new Date().toISOString().slice(0, 10),
          note: typeof item.note === "string" ? item.note.trim() : "",
          part_name: typeof item.part_name === "string" ? item.part_name.trim() : "",
          is_public: item.is_public !== false,
        };
      })
      .filter((expense) => expense.name.length > 0 && expense.amount >= 0);
  } catch {
    return [];
  }
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === "string") return error || fallback;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function errorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : "";
}

function logProjectCreationError(stage: string, error: unknown) {
  if (!error || typeof error !== "object") {
    console.error(`Erro ao criar projeto (${stage}):`, error);
    return;
  }

  const details = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };

  console.error(`Erro ao criar projeto (${stage}):`, {
    code: typeof details.code === "string" ? details.code : undefined,
    message: typeof details.message === "string" ? details.message : undefined,
    details: typeof details.details === "string" ? details.details : undefined,
    hint: typeof details.hint === "string" ? details.hint : undefined,
  });
}

function projectCreationErrorMessage(error: unknown, fallback = "Nao foi possivel criar o projeto.") {
  const message = errorMessage(error, fallback);
  const code = errorCode(error);
  const lower = message.toLowerCase();

  if (code === "42501" || lower.includes("row-level security") || lower.includes("violates row-level security")) {
    return "Sem permissao para criar o projeto. Entre novamente e tente de novo.";
  }

  if (
    code === "42703" ||
    code === "42P01" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    lower.includes("schema cache") ||
    lower.includes("could not find") ||
    lower.includes("column") ||
    lower.includes("relation") ||
    lower.includes("does not exist")
  ) {
    return "Banco de dados desatualizado para criar projetos. Aplique a migration de reparo do Supabase e tente novamente.";
  }

  if (code === "23505" && lower.includes("slug")) {
    return "Ja existe um projeto com esse slug. Tente mudar o nome do projeto.";
  }

  if (code === "23502") {
    return "Um campo obrigatorio do projeto nao foi enviado. Atualize a pagina e tente novamente.";
  }

  if (code === "23514") {
    return "Algum campo do projeto esta fora do formato aceito. Revise os dados e tente novamente.";
  }

  if (lower.includes("foreign key") && lower.includes("profiles")) {
    return "Nao foi possivel vincular seu perfil ao projeto. Atualize a pagina e tente novamente.";
  }

  return message;
}

function usernameFromUser(user: User) {
  const emailName = user.email?.split("@")[0] ?? "membro";
  return normalizeSlug(`${emailName}-${user.id.slice(0, 6)}`).slice(0, 24);
}

async function requireUser() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null, error: "Supabase nao configurado." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, error: "Entre para continuar." };
  return { supabase, user, error: null };
}

async function ensureProfile(supabase: ServerSupabaseClient, user: User) {
  const { data: profile, error: readError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, city, state, instagram_handle, is_saves_public, cars_count, followers_count, following_count, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) return { ok: false, message: readError.message };
  if (profile) return { ok: true, message: null };

  const displayName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : user.email ?? "Membro Projeto Garagem";

  const username = usernameFromUser(user);
  const avatarUrl = typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      username,
      display_name: displayName,
      avatar_url: avatarUrl,
    })
    .select("id, username, display_name, avatar_url, bio, city, state, instagram_handle, is_saves_public, cars_count, followers_count, following_count, created_at, updated_at")
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  return data ? { ok: true, message: null } : { ok: false, message: "Nao foi possivel preparar seu perfil." };
}

async function uniqueCarSlug(supabase: ServerSupabaseClient, base: string, currentId?: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${globalThis.crypto.randomUUID().slice(0, 5)}`;
    const candidate = `${base}${suffix}`.slice(0, 80);
    const { data } = await supabase.from("cars").select("id").eq("slug", candidate).maybeSingle();
    if (!data || data.id === currentId) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`.slice(0, 90);
}

async function notifyProjectFollowers({
  supabase,
  carId,
  ownerId,
  carName,
  updateTitle,
}: {
  supabase: ServerSupabaseClient;
  carId: string;
  ownerId: string;
  carName: string;
  updateTitle: string;
}) {
  const { data: follows } = await supabase
    .from("project_follows")
    .select("user_id")
    .eq("car_id", carId);

  const recipients = ((follows ?? []) as Array<{ user_id: string }>)
    .map((follow) => follow.user_id)
    .filter((userId) => userId !== ownerId);

  await Promise.all(
    recipients.map((recipientId) =>
      supabase.rpc("create_notification", {
        p_recipient_id: recipientId,
        p_notification_type: "project_update",
        p_car_id: carId,
        p_notification_title: `${carName} publicou uma nova evolucao`,
        p_notification_body: updateTitle,
        p_dedupe: false,
      })
    )
  );

  if (recipients.length) revalidatePath("/notificacoes");
}

function buildCarPayload(formData: FormData, ownerId: string, slug: string) {
  const name = text(formData, "name");
  const brand = text(formData, "brand");
  const model = text(formData, "model");
  const year = integer(formData, "year");
  const category = text(formData, "category");
  const mainPhoto = nullableText(formData, "main_photo_url");
  const photos = parseStringArray(text(formData, "photo_urls_json"));
  const photoUrls = Array.from(new Set([mainPhoto, ...photos].filter((url): url is string => Boolean(url))));
  const description = nullableText(formData, "description");
  const projectGoal = nullableText(formData, "project_goal");
  const engine = nullableText(formData, "engine");
  const powerCv = integer(formData, "power_cv");
  const torqueNm = integer(formData, "torque_nm");
  const weightKg = integer(formData, "weight_kg");
  const mileageKm = integer(formData, "mileage_km");
  const fuelType = nullableText(formData, "fuel_type");
  const transmission = nullableText(formData, "transmission");
  const drivetrain = nullableText(formData, "drivetrain");
  const suspension = nullableText(formData, "suspension");
  const wheels = nullableText(formData, "wheels");
  const tires = nullableText(formData, "tires");
  const brakes = nullableText(formData, "brakes");
  const projectStatus = nullableText(formData, "project_status");
  const tags = parseTagString(text(formData, "tags_csv"));
  const versionConfidence = dataConfidence(formData, "version_confidence", "unknown");
  const originalEngineAnswer = detailAnswer(formData, "original_engine_answer");
  const originalInductionAnswer = detailAnswer(formData, "original_induction_answer");
  const originalColorAnswer = detailAnswer(formData, "original_color_answer");
  const originalWheelsAnswer = detailAnswer(formData, "original_wheels_answer");
  const originalInteriorAnswer = detailAnswer(formData, "original_interior_answer");
  const originalSuspensionAnswer = detailAnswer(formData, "original_suspension_answer");
  const specConfidencePercent = calculateSpecConfidence({
    versionConfidence,
    originalEngineAnswer,
    originalInductionAnswer,
    originalColorAnswer,
    originalWheelsAnswer,
    originalInteriorAnswer,
    originalSuspensionAnswer,
  });

  return {
    owner_id: ownerId,
    slug,
    name,
    brand,
    model,
    year: year ?? new Date().getFullYear(),
    version: nullableText(formData, "version"),
    catalog_version_id: uuidText(formData, "catalog_version_id"),
    version_confidence: versionConfidence,
    factory_spec_confidence: dataConfidence(formData, "factory_spec_confidence", mainPhoto ? "estimated" : "unknown"),
    factory_specs_note: nullableText(formData, "factory_specs_note"),
    factory_engine: nullableText(formData, "factory_engine"),
    factory_induction: nullableText(formData, "factory_induction"),
    factory_power_cv: integer(formData, "factory_power_cv"),
    factory_transmission: nullableText(formData, "factory_transmission"),
    factory_drivetrain: nullableText(formData, "factory_drivetrain"),
    spec_confidence_percent: specConfidencePercent,
    original_engine_answer: originalEngineAnswer,
    original_induction_answer: originalInductionAnswer,
    current_induction: nullableText(formData, "current_induction"),
    original_color_answer: originalColorAnswer,
    original_wheels_answer: originalWheelsAnswer,
    original_interior_answer: originalInteriorAnswer,
    original_suspension_answer: originalSuspensionAnswer,
    category: category || "Projeto automotivo",
    state: nullableText(formData, "state"),
    city: nullableText(formData, "city"),
    description,
    main_photo_url: mainPhoto,
    photo_urls: photoUrls,
    engine,
    power_cv: powerCv,
    torque_nm: torqueNm,
    weight_kg: weightKg,
    mileage_km: mileageKm,
    fuel_type: fuelType,
    transmission,
    drivetrain,
    suspension,
    wheels,
    tires,
    brakes,
    project_status: projectStatus,
    progress_percent: calculateEssentialProjectProgress({
      name,
      slug,
      brand,
      model,
      year,
      version: nullableText(formData, "version"),
      versionConfidence,
      city: nullableText(formData, "city"),
      state: nullableText(formData, "state"),
      isPublic: formData.get("is_public") === "true",
      photoUrls,
      description,
      projectGoal,
      engine,
      powerCv,
      fuelType,
      transmission,
      drivetrain,
      projectStatus,
      tags,
    }),
    started_at: nullableText(formData, "started_at"),
    project_goal: projectGoal,
    tags,
    show_expenses_public: formData.get("show_expenses_public") === "true",
    is_public: formData.get("is_public") === "true",
  };
}

async function replacePhotos(
  supabase: ServerSupabaseClient,
  carId: string,
  mainPhotoUrl: string | null,
  photoUrls: string[]
) {
  const { error: deleteError } = await supabase.from("car_photos").delete().eq("car_id", carId);
  if (deleteError) return deleteError.message;
  const urls = Array.from(new Set([mainPhotoUrl, ...photoUrls].filter((url): url is string => Boolean(url))));
  if (!urls.length) return null;

  const { error } = await supabase.from("car_photos").insert(
    urls.map((url, index) => ({
      car_id: carId,
      url,
      sort_order: index,
      alt: index === 0 ? "Foto principal do carro" : "Foto do projeto",
    }))
  );
  return error?.message ?? null;
}

async function replaceParts(supabase: ServerSupabaseClient, carId: string, parts: PartInput[]) {
  const { error: deleteError } = await supabase.from("car_parts").delete().eq("car_id", carId);
  if (deleteError) return deleteError.message;
  if (!parts.length) return null;

  const { error } = await supabase.from("car_parts").insert(
    parts.map((part) => ({
      car_id: carId,
      name: part.name,
      category: part.category || "Outros",
      brand: part.brand || null,
      description: part.description || null,
      status: part.status,
      priority: part.priority || null,
      price_estimate: part.price_estimate ?? null,
      external_url: part.external_url || null,
      affiliate_url: part.affiliate_url || null,
      store_name: part.store_name || null,
      product_id: part.product_id || null,
      installed_at: part.installed_at || null,
      image_url: part.image_url || null,
    }))
  );
  return error?.message ?? null;
}

async function replaceUpdates(supabase: ServerSupabaseClient, carId: string, updates: UpdateInput[]) {
  const { error: deleteError } = await supabase.from("car_build_updates").delete().eq("car_id", carId);
  if (deleteError) return deleteError.message;
  if (!updates.length) return null;

  const { error } = await supabase.from("car_build_updates").insert(
    updates.map((update) => ({
      car_id: carId,
      title: update.title,
      description: update.description || null,
      photo_url: update.photo_url || null,
      photo_urls: Array.from(
        new Set([update.photo_url, ...(update.photo_urls ?? [])].filter((url): url is string => Boolean(url)))
      ),
      category: update.category || "outro",
      happened_at: update.happened_at,
      amount_spent: update.amount_spent ?? null,
    }))
  );
  return error?.message ?? null;
}

async function replaceExpenses(supabase: ServerSupabaseClient, carId: string, expenses: ExpenseInput[]) {
  const { error: deleteError } = await supabase.from("car_expenses").delete().eq("car_id", carId);
  if (deleteError) return deleteError.message;
  if (!expenses.length) return null;

  const { error } = await supabase.from("car_expenses").insert(
    expenses.map((expense) => ({
      car_id: carId,
      name: expense.name,
      category: expense.category || "Outros",
      amount: Math.max(0, expense.amount),
      spent_at: expense.spent_at,
      note: expense.note || null,
      part_name: expense.part_name || null,
      is_public: expense.is_public !== false,
    }))
  );
  return error?.message ?? null;
}

export function revalidateProjectCreationPaths(slug: string) {
  revalidatePath("/");
  revalidatePath("/explorar");
  revalidatePath("/buscar");
  revalidatePath("/comparar");
  revalidatePath("/garagem");
  revalidatePath(`/projeto/${slug}`);
  revalidatePath(`/carros/${slug}`);
}

export function revalidateProjectUpdatePaths(previousSlug: string, nextSlug: string) {
  revalidatePath("/");
  revalidatePath("/explorar");
  revalidatePath("/buscar");
  revalidatePath("/comparar");
  revalidatePath("/garagem");
  revalidatePath(`/carros/${previousSlug}`);
  revalidatePath(`/carros/${nextSlug}`);
  revalidatePath(`/projeto/${previousSlug}`);
  revalidatePath(`/projeto/${nextSlug}`);
}

export async function createCarProject(formData: FormData): Promise<CreateCarProjectResult> {
  try {
    const auth = await requireUser();
    if (!auth.supabase || !auth.user) {
      return { ok: false, status: 401, message: auth.error ?? "Erro de autenticacao." };
    }

    const profile = await ensureProfile(auth.supabase, auth.user);
    if (!profile.ok) {
      return {
        ok: false,
        status: 400,
        message: profile.message ?? "Nao foi possivel preparar seu perfil.",
      };
    }

    const name = text(formData, "name");
    const brand = text(formData, "brand");
    const model = text(formData, "model");
    const year = integer(formData, "year");

    if (!name || !brand || !model || !year) {
      return { ok: false, status: 400, message: "Preencha nome do projeto, marca, modelo e ano." };
    }

    const slug = await uniqueCarSlug(auth.supabase, normalizeSlug(`${name}-${brand}-${model}-${year}`));
    const payload = buildCarPayload(formData, auth.user.id, slug);
    const { data: car, error } = await auth.supabase
      .from("cars")
      .insert(payload)
      .select("id, slug, main_photo_url, photo_urls")
      .maybeSingle();

    if (error || !car) {
      logProjectCreationError("insert cars", error ?? "Insert em cars nao retornou linha.");
      return {
        ok: false,
        status: 400,
        message: projectCreationErrorMessage(error, "Nao foi possivel criar o carro."),
      };
    }

    const photoUrls = parseStringArray(text(formData, "photo_urls_json"));
    const parts = parseParts(text(formData, "parts_json"));
    const updates = parseUpdates(text(formData, "updates_json"));
    const expenses = parseExpenses(text(formData, "expenses_json"));
    const relatedError =
      (await replacePhotos(auth.supabase, car.id, car.main_photo_url, photoUrls)) ??
      (await replaceParts(auth.supabase, car.id, parts)) ??
      (await replaceUpdates(auth.supabase, car.id, updates)) ??
      (await replaceExpenses(auth.supabase, car.id, expenses));

    if (relatedError) {
      console.error("Projeto criado, mas houve erro ao salvar detalhes auxiliares:", relatedError);
    }

    return {
      ok: true,
      slug: car.slug,
      redirectTo: `/projeto/${car.slug}`,
    };
  } catch (error) {
    console.error("Erro ao criar projeto:", error);
    return {
      ok: false,
      status: 500,
      message: projectCreationErrorMessage(error),
    };
  }
}

export async function updateCarProject(
  carId: string,
  formData: FormData
): Promise<UpdateCarProjectResult> {
  try {
    const auth = await requireUser();
    if (!auth.supabase || !auth.user) {
      return { ok: false, status: 401, message: auth.error ?? "Erro de autenticacao." };
    }

    if (!carId) {
      return { ok: false, status: 400, message: "Projeto nao encontrado." };
    }

    const formCarId = text(formData, "car_id");
    if (formCarId && formCarId !== carId) {
      return { ok: false, status: 400, message: "Projeto enviado nao confere com a rota." };
    }

    const { data: current, error: readError } = await auth.supabase
      .from("cars")
      .select("id, owner_id, slug, name")
      .eq("id", carId)
      .maybeSingle();

    if (readError) {
      return { ok: false, status: 400, message: readError.message };
    }

    if (!current) {
      return { ok: false, status: 404, message: "Projeto nao encontrado." };
    }

    if (current.owner_id !== auth.user.id) {
      return { ok: false, status: 403, message: "Voce so pode editar seus proprios projetos." };
    }

    const name = text(formData, "name");
    const brand = text(formData, "brand");
    const model = text(formData, "model");
    const year = integer(formData, "year");
    if (!name || !brand || !model || !year) {
      return { ok: false, status: 400, message: "Preencha nome do projeto, marca, modelo e ano." };
    }

    const requestedSlug = normalizeSlug(text(formData, "slug") || `${name}-${brand}-${model}-${year}`);
    const slug = await uniqueCarSlug(auth.supabase, requestedSlug, carId);
    const payload = buildCarPayload(formData, auth.user.id, slug);
    const { data: car, error } = await auth.supabase
      .from("cars")
      .update(payload)
      .eq("id", carId)
      .eq("owner_id", auth.user.id)
      .select("id, slug, name, main_photo_url")
      .maybeSingle();

    if (error || !car) {
      return {
        ok: false,
        status: 400,
        message: error?.message ?? "Nao foi possivel salvar.",
      };
    }

    const photoUrls = parseStringArray(text(formData, "photo_urls_json"));
    const parts = parseParts(text(formData, "parts_json"));
    const updates = parseUpdates(text(formData, "updates_json"));
    const expenses = parseExpenses(text(formData, "expenses_json"));
    const { data: previousUpdates } = await auth.supabase
      .from("car_build_updates")
      .select("title, happened_at")
      .eq("car_id", carId);
    const previousUpdateKeys = new Set(
      ((previousUpdates ?? []) as Array<{ title: string; happened_at: string }>).map(
        (update) => `${update.title.trim()}|${update.happened_at}`
      )
    );

    const relatedError =
      (await replacePhotos(auth.supabase, car.id, car.main_photo_url, photoUrls)) ??
      (await replaceParts(auth.supabase, car.id, parts)) ??
      (await replaceUpdates(auth.supabase, car.id, updates)) ??
      (await replaceExpenses(auth.supabase, car.id, expenses));

    if (relatedError) {
      return {
        ok: false,
        status: 400,
        message: `Ficha salva, mas houve erro ao atualizar detalhes: ${relatedError}`,
      };
    }

    const newUpdate = updates.find(
      (update) => !previousUpdateKeys.has(`${update.title.trim()}|${update.happened_at}`)
    );
    if (newUpdate) {
      await notifyProjectFollowers({
        supabase: auth.supabase,
        carId: car.id,
        ownerId: auth.user.id,
        carName: car.name ?? current.name,
        updateTitle: newUpdate.title,
      });
    }

    return {
      ok: true,
      slug: car.slug,
      redirectTo: `/projeto/${car.slug}`,
    };
  } catch (error) {
    console.error("Erro ao editar projeto:", error);
    return {
      ok: false,
      status: 500,
      message: errorMessage(error, "Nao foi possivel salvar."),
    };
  }
}
