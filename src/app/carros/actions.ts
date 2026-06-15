"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { calculateSpecConfidence, type DataConfidence, type DetailAnswer } from "@/lib/car-catalog";
import type { CarPartStatus, NotificationType } from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeSlug } from "@/lib/garage/constants";
import { parseTagString } from "@/lib/projects/utils";

export type ActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export const initialActionState: ActionState = {
  status: "idle",
  message: "",
};

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

function usernameFromUser(user: User) {
  const emailName = user.email?.split("@")[0] ?? "membro";
  return normalizeSlug(`${emailName}-${user.id.slice(0, 6)}`).slice(0, 24);
}

async function requireUser() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null, error: "Supabase não configurado." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, error: "Entre para continuar." };
  return { supabase, user, error: null };
}

async function ensureProfile(user: User) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, city, state, instagram_handle, is_saves_public, cars_count, followers_count, following_count, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) return profile;

  const displayName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : user.email ?? "Membro Projeto Garagem";

  const username = usernameFromUser(user);
  const avatarUrl = typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  const { data } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      username,
      display_name: displayName,
      avatar_url: avatarUrl,
    })
    .select("id, username, display_name, avatar_url, bio, city, state, instagram_handle, is_saves_public, cars_count, followers_count, following_count, created_at, updated_at")
    .maybeSingle();

  return data ?? null;
}

async function uniqueCarSlug(base: string, currentId?: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return base;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${globalThis.crypto.randomUUID().slice(0, 5)}`;
    const candidate = `${base}${suffix}`.slice(0, 80);
    const { data } = await supabase.from("cars").select("id").eq("slug", candidate).maybeSingle();
    if (!data || data.id === currentId) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`.slice(0, 90);
}

async function notifyCarOwner({
  ownerId,
  actorId,
  carId,
  type,
  title,
  body,
}: {
  ownerId: string | null | undefined;
  actorId: string;
  carId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
}) {
  if (!ownerId || ownerId === actorId) return;

  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  await supabase.from("notifications").insert({
    user_id: ownerId,
    actor_id: actorId,
    car_id: carId,
    type,
    title,
    body: body ?? null,
  });
  revalidatePath("/notificacoes");
}

async function notifyProjectFollowers({
  carId,
  ownerId,
  carName,
  updateTitle,
}: {
  carId: string;
  ownerId: string;
  carName: string;
  updateTitle: string;
}) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const { data: follows } = await supabase
    .from("project_follows")
    .select("user_id")
    .eq("car_id", carId);

  const rows = ((follows ?? []) as Array<{ user_id: string }>)
    .filter((follow) => follow.user_id !== ownerId)
    .map((follow) => ({
      user_id: follow.user_id,
      actor_id: ownerId,
      car_id: carId,
      type: "project_update" as NotificationType,
      title: `${carName} publicou uma nova evolução`,
      body: updateTitle,
    }));

  if (rows.length) {
    await supabase.from("notifications").insert(rows);
    revalidatePath("/notificacoes");
  }
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
    description: nullableText(formData, "description"),
    main_photo_url: mainPhoto,
    photo_urls: photoUrls,
    engine: nullableText(formData, "engine"),
    power_cv: integer(formData, "power_cv"),
    torque_nm: integer(formData, "torque_nm"),
    weight_kg: integer(formData, "weight_kg"),
    mileage_km: integer(formData, "mileage_km"),
    fuel_type: nullableText(formData, "fuel_type"),
    transmission: nullableText(formData, "transmission"),
    drivetrain: nullableText(formData, "drivetrain"),
    suspension: nullableText(formData, "suspension"),
    wheels: nullableText(formData, "wheels"),
    tires: nullableText(formData, "tires"),
    brakes: nullableText(formData, "brakes"),
    project_status: nullableText(formData, "project_status"),
    progress_percent: integer(formData, "progress_percent"),
    started_at: nullableText(formData, "started_at"),
    project_goal: nullableText(formData, "project_goal"),
    tags: parseTagString(text(formData, "tags_csv")),
    show_expenses_public: formData.get("show_expenses_public") === "true",
    is_public: formData.get("is_public") === "true",
  };
}

async function replacePhotos(carId: string, mainPhotoUrl: string | null, photoUrls: string[]) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

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

async function replaceParts(carId: string, parts: PartInput[]) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

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

async function replaceUpdates(carId: string, updates: UpdateInput[]) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

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

async function replaceExpenses(carId: string, expenses: ExpenseInput[]) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

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

export async function saveProfileAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) return { status: "error", message: auth.error ?? "Erro de autenticacao." };

  const username = normalizeSlug(text(formData, "username")).slice(0, 24);
  const displayName = text(formData, "display_name");

  if (username.length < 3) return { status: "error", message: "Escolha um username com pelo menos 3 caracteres." };
  if (!displayName) return { status: "error", message: "Informe seu nome." };

  const { error } = await auth.supabase.from("profiles").upsert({
    id: auth.user.id,
    username,
    display_name: displayName,
    avatar_url:
      nullableText(formData, "avatar_url") ??
      (typeof auth.user.user_metadata?.avatar_url === "string" ? auth.user.user_metadata.avatar_url : null),
    bio: nullableText(formData, "bio"),
    city: nullableText(formData, "city"),
    state: nullableText(formData, "state"),
    instagram_handle: nullableText(formData, "instagram_handle"),
    is_saves_public: formData.get("is_saves_public") === "true",
    is_likes_public: formData.get("is_likes_public") === "true",
  });

  if (error) return { status: "error", message: error.message };

  revalidatePath("/perfil");
  revalidatePath(`/perfil/${username}`);
  redirect("/garagem");
}

export async function createCarAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) return { status: "error", message: auth.error ?? "Erro de autenticacao." };

  await ensureProfile(auth.user);

  const name = text(formData, "name");
  const brand = text(formData, "brand");
  const model = text(formData, "model");
  const year = integer(formData, "year");
  const mainPhoto = nullableText(formData, "main_photo_url");

  if (!name || !brand || !model || !year) {
    return { status: "error", message: "Preencha nome do projeto, marca, modelo e ano." };
  }
  if (!mainPhoto) {
    return { status: "error", message: "Adicione uma foto principal para criar o projeto." };
  }

  const slug = await uniqueCarSlug(normalizeSlug(`${name}-${brand}-${model}-${year}`));
  const payload = buildCarPayload(formData, auth.user.id, slug);
  const { data: car, error } = await auth.supabase.from("cars").insert(payload).select("id, slug, main_photo_url, photo_urls").maybeSingle();

  if (error || !car) return { status: "error", message: error?.message ?? "Nao foi possivel criar o carro." };

  const photoUrls = parseStringArray(text(formData, "photo_urls_json"));
  const parts = parseParts(text(formData, "parts_json"));
  const updates = parseUpdates(text(formData, "updates_json"));
  const expenses = parseExpenses(text(formData, "expenses_json"));
  const relatedError =
    (await replacePhotos(car.id, car.main_photo_url, photoUrls)) ??
    (await replaceParts(car.id, parts)) ??
    (await replaceUpdates(car.id, updates)) ??
    (await replaceExpenses(car.id, expenses));

  if (relatedError) {
    console.error("Projeto criado, mas houve erro ao salvar detalhes auxiliares:", relatedError);
  }

  revalidatePath("/");
  revalidatePath("/explorar");
  revalidatePath("/buscar");
  revalidatePath("/comparar");
  revalidatePath("/garagem");
  revalidatePath(`/projeto/${car.slug}`);
  revalidatePath(`/carros/${car.slug}`);
  redirect(`/projeto/${car.slug}`);
}

export async function updateCarAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) return { status: "error", message: auth.error ?? "Erro de autenticacao." };

  const carId = text(formData, "car_id");
  if (!carId) return { status: "error", message: "Carro não encontrado." };

  const { data: current } = await auth.supabase
    .from("cars")
    .select("id, owner_id, slug, name")
    .eq("id", carId)
    .maybeSingle();

  if (!current || current.owner_id !== auth.user.id) {
    return { status: "error", message: "Você só pode editar seus próprios carros." };
  }

  const name = text(formData, "name");
  const brand = text(formData, "brand");
  const model = text(formData, "model");
  const year = integer(formData, "year");
  if (!name || !brand || !model || !year) {
    return { status: "error", message: "Preencha nome do projeto, marca, modelo e ano." };
  }

  const requestedSlug = normalizeSlug(text(formData, "slug") || `${name}-${brand}-${model}-${year}`);
  const slug = await uniqueCarSlug(requestedSlug, carId);
  const payload = buildCarPayload(formData, auth.user.id, slug);
  const { data: car, error } = await auth.supabase
    .from("cars")
    .update(payload)
    .eq("id", carId)
    .select("id, slug, name, main_photo_url")
    .maybeSingle();

  if (error || !car) return { status: "error", message: error?.message ?? "Nao foi possivel salvar." };

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
    (await replacePhotos(car.id, car.main_photo_url, photoUrls)) ??
    (await replaceParts(car.id, parts)) ??
    (await replaceUpdates(car.id, updates)) ??
    (await replaceExpenses(car.id, expenses));

  if (relatedError) {
    return {
      status: "error",
      message: `Ficha salva, mas houve erro ao atualizar detalhes: ${relatedError}`,
    };
  }

  const newUpdate = updates.find(
    (update) => !previousUpdateKeys.has(`${update.title.trim()}|${update.happened_at}`)
  );
  if (newUpdate) {
    await notifyProjectFollowers({
      carId: car.id,
      ownerId: auth.user.id,
      carName: car.name ?? current.name,
      updateTitle: newUpdate.title,
    });
  }

  revalidatePath("/");
  revalidatePath("/explorar");
  revalidatePath("/buscar");
  revalidatePath("/comparar");
  revalidatePath("/garagem");
  revalidatePath(`/carros/${current.slug}`);
  revalidatePath(`/carros/${car.slug}`);
  revalidatePath(`/projeto/${current.slug}`);
  revalidatePath(`/projeto/${car.slug}`);
  redirect(`/projeto/${car.slug}`);
}

export async function deleteCarAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) {
    return { status: "error", message: auth.error ?? "Erro de autenticacao." };
  }

  const carId = text(formData, "car_id");
  if (!carId) return { status: "error", message: "Projeto não encontrado." };

  const { data: current, error: readError } = await auth.supabase
    .from("cars")
    .select("id, owner_id, slug")
    .eq("id", carId)
    .maybeSingle();

  if (readError) return { status: "error", message: readError.message };
  if (!current || current.owner_id !== auth.user.id) {
    return { status: "error", message: "Você só pode excluir seus próprios projetos." };
  }

  const { error } = await auth.supabase
    .from("cars")
    .delete()
    .eq("id", carId)
    .eq("owner_id", auth.user.id);

  if (error) return { status: "error", message: error.message };

  revalidatePath("/");
  revalidatePath("/explorar");
  revalidatePath("/rankings");
  revalidatePath("/buscar");
  revalidatePath("/comparar");
  revalidatePath("/garagem");
  revalidatePath(`/carros/${current.slug}`);
  revalidatePath(`/projeto/${current.slug}`);
  redirect("/garagem");
}

export async function toggleLikeAction(carId: string) {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) return { ok: false, message: auth.error ?? "Entre para curtir.", active: false };
  await ensureProfile(auth.user);

  const { data: car } = await auth.supabase
    .from("cars")
    .select("id, slug, owner_id, name")
    .eq("id", carId)
    .maybeSingle();

  const { data: existing } = await auth.supabase
    .from("car_likes")
    .select("car_id")
    .eq("car_id", carId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (existing) {
    await auth.supabase.from("car_likes").delete().eq("car_id", carId).eq("user_id", auth.user.id);
    revalidatePath("/explorar");
    revalidatePath("/rankings");
    if (car?.slug) {
      revalidatePath(`/projeto/${car.slug}`);
      revalidatePath(`/carros/${car.slug}`);
    }
    return { ok: true, active: false };
  }

  const { error } = await auth.supabase.from("car_likes").insert({ car_id: carId, user_id: auth.user.id });
  if (!error && car) {
    await notifyCarOwner({
      ownerId: car.owner_id,
      actorId: auth.user.id,
      carId,
      type: "project_like",
      title: `${car.name} recebeu uma curtida`,
      body: "Alguém curtiu seu projeto.",
    });
  }
  revalidatePath("/explorar");
  revalidatePath("/rankings");
  if (car?.slug) {
    revalidatePath(`/projeto/${car.slug}`);
    revalidatePath(`/carros/${car.slug}`);
  }
  return { ok: !error, message: error?.message, active: !error };
}

export async function toggleSaveAction(carId: string) {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) return { ok: false, message: auth.error ?? "Entre para salvar.", active: false };
  await ensureProfile(auth.user);

  const { data: car } = await auth.supabase
    .from("cars")
    .select("id, slug, owner_id, name")
    .eq("id", carId)
    .maybeSingle();

  const { data: existing } = await auth.supabase
    .from("car_saves")
    .select("car_id")
    .eq("car_id", carId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (existing) {
    await auth.supabase.from("car_saves").delete().eq("car_id", carId).eq("user_id", auth.user.id);
    revalidatePath("/garagem");
    if (car?.slug) {
      revalidatePath(`/projeto/${car.slug}`);
      revalidatePath(`/carros/${car.slug}`);
    }
    return { ok: true, active: false };
  }

  const { error } = await auth.supabase.from("car_saves").insert({ car_id: carId, user_id: auth.user.id });
  if (!error && car) {
    await notifyCarOwner({
      ownerId: car.owner_id,
      actorId: auth.user.id,
      carId,
      type: "project_save",
      title: `${car.name} foi salvo`,
      body: "Alguém salvou seu projeto na garagem.",
    });
  }
  revalidatePath("/garagem");
  if (car?.slug) {
    revalidatePath(`/projeto/${car.slug}`);
    revalidatePath(`/carros/${car.slug}`);
  }
  return { ok: !error, message: error?.message, active: !error };
}

export async function toggleFollowUserAction(profileId: string) {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) {
    return { ok: false, message: auth.error ?? "Entre para seguir perfis.", active: false };
  }
  await ensureProfile(auth.user);

  if (!profileId || profileId === auth.user.id) {
    return { ok: false, message: "Você não pode seguir o próprio perfil.", active: false };
  }

  const { data: existing } = await auth.supabase
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", auth.user.id)
    .eq("following_id", profileId)
    .maybeSingle();

  if (existing) {
    const { error } = await auth.supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", auth.user.id)
      .eq("following_id", profileId);
    revalidatePath("/garagem");
    revalidatePath("/perfil");
    return { ok: !error, message: error?.message, active: false };
  }

  const { error } = await auth.supabase.from("user_follows").insert({
    follower_id: auth.user.id,
    following_id: profileId,
  });

  revalidatePath("/garagem");
  revalidatePath("/perfil");
  return { ok: !error, message: error?.message, active: !error };
}

export async function toggleProjectFollowAction(carId: string) {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) {
    return { ok: false, message: auth.error ?? "Entre para seguir projetos.", active: false };
  }
  await ensureProfile(auth.user);

  const { data: car, error: carError } = await auth.supabase
    .from("cars")
    .select("id, slug, owner_id, name")
    .eq("id", carId)
    .maybeSingle();

  if (carError || !car) {
    return { ok: false, message: carError?.message ?? "Projeto não encontrado.", active: false };
  }

  if (car.owner_id === auth.user.id) {
    return { ok: false, message: "Você já é dono deste projeto.", active: false };
  }

  const { data: existing } = await auth.supabase
    .from("project_follows")
    .select("id")
    .eq("car_id", carId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await auth.supabase
      .from("project_follows")
      .delete()
      .eq("car_id", carId)
      .eq("user_id", auth.user.id);
    revalidatePath("/garagem");
    revalidatePath(`/projeto/${car.slug}`);
    revalidatePath(`/carros/${car.slug}`);
    return { ok: !error, message: error?.message, active: false };
  }

  const { error } = await auth.supabase.from("project_follows").insert({
    car_id: carId,
    user_id: auth.user.id,
  });

  if (!error) {
    await notifyCarOwner({
      ownerId: car.owner_id,
      actorId: auth.user.id,
      carId,
      type: "project_follow",
      title: `${car.name} ganhou um seguidor`,
      body: "Alguém começou a acompanhar este projeto.",
    });
  }

  revalidatePath("/garagem");
  revalidatePath(`/projeto/${car.slug}`);
  revalidatePath(`/carros/${car.slug}`);
  return { ok: !error, message: error?.message, active: !error };
}

export async function incrementViewAction(carId: string, carSlug: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false };

  const { data, error } = await supabase.rpc("increment_car_view", {
    target_car_id: carId,
  });

  if (error || !data) return { ok: false };

  revalidatePath("/");
  revalidatePath("/explorar");
  revalidatePath("/rankings");
  revalidatePath(`/carros/${carSlug}`);
  revalidatePath(`/projeto/${carSlug}`);

  return { ok: true };
}

export async function createCommentAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) return { status: "error", message: auth.error ?? "Entre para comentar." };
  await ensureProfile(auth.user);

  const carId = text(formData, "car_id");
  const slug = text(formData, "slug");
  const content = text(formData, "content");
  if (!carId || content.length < 2) return { status: "error", message: "Escreva um comentario com pelo menos 2 caracteres." };

  const { data: car } = await auth.supabase
    .from("cars")
    .select("id, owner_id, name")
    .eq("id", carId)
    .maybeSingle();

  const { error } = await auth.supabase.from("car_comments").insert({
    car_id: carId,
    user_id: auth.user.id,
    content,
  });

  if (error) return { status: "error", message: error.message };
  if (car) {
    await notifyCarOwner({
      ownerId: car.owner_id,
      actorId: auth.user.id,
      carId,
      type: "project_comment",
      title: `${car.name} recebeu um comentário`,
      body: content.slice(0, 160),
    });
  }
  revalidatePath(`/projeto/${slug}`);
  revalidatePath(`/carros/${slug}`);
  return { status: "success", message: "Comentario publicado." };
}

export async function deleteCommentAction(commentId: string, carSlug: string) {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) return { ok: false, message: auth.error ?? "Entre para continuar." };

  const { error } = await auth.supabase.from("car_comments").delete().eq("id", commentId);
  revalidatePath(`/projeto/${carSlug}`);
  revalidatePath(`/carros/${carSlug}`);
  return { ok: !error, message: error?.message };
}

export async function markNotificationReadAction(notificationId: string) {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) {
    return { ok: false, message: auth.error ?? "Entre para ver notificações." };
  }

  const { error } = await auth.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", auth.user.id);

  revalidatePath("/notificacoes");
  return { ok: !error, message: error?.message };
}
