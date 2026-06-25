"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { calculateSpecConfidence, type DataConfidence, type DetailAnswer } from "@/lib/car-catalog";
import type { CarPartStatus, NotificationType } from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeSlug } from "@/lib/garage/constants";
import { calculateEssentialProjectProgress } from "@/lib/garage/project-completion";
import { parseTagString } from "@/lib/projects/utils";
import type { CarCommentWithAuthor, ProfileSummary } from "@/lib/supabase/queries";

export type ActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

type ServerSupabaseClient = NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>;

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

type SupabaseActionError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

type DiagnosticContext = Record<string, string | boolean | null | undefined>;

function formatSupabaseActionError(action: string, error: SupabaseActionError) {
  const code = error.code ? ` (${error.code})` : "";
  return `${action} falhou${code}: ${error.message}`;
}

function logSupabaseActionError(action: string, context: Record<string, string>, error: SupabaseActionError) {
  console.error("[social-action]", action, {
    ...context,
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}

function logNotificationRpcError(
  action: string,
  context: DiagnosticContext,
  error: SupabaseActionError
) {
  console.error("[notification-rpc]", action, {
    ...context,
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}

function logSocialActionDiagnostic(action: string, context: DiagnosticContext = {}) {
  console.info("[social-action-diagnostic]", action, context);
}

async function createNotification(
  supabase: ServerSupabaseClient,
  {
    actorId,
    recipientId,
    type,
    carId,
    title,
    body,
    dedupe = true,
    source,
  }: {
    actorId: string;
    recipientId: string;
    type: NotificationType;
    carId: string | null;
    title: string;
    body?: string | null;
    dedupe?: boolean;
    source: string;
  }
) {
  const rpcContext = {
    source,
    actorId,
    recipientId,
    carId,
    notificationType: type,
    dedupe,
  };
  console.info("[notification-rpc]", "create_notification.before", rpcContext);

  const { data, error } = await supabase.rpc("create_notification", {
    p_recipient_id: recipientId,
    p_notification_type: type,
    p_car_id: carId,
    p_notification_title: title,
    p_notification_body: body ?? null,
    p_dedupe: dedupe,
  });

  console.info("[notification-rpc]", "create_notification.after", {
    ...rpcContext,
    data,
    error,
  });

  if (error) {
    logNotificationRpcError(source, rpcContext, error);
    return null;
  }

  if (!data) {
    console.warn("[notification-rpc]", `${source}.skipped`, rpcContext);
  }

  return data;
}

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
  if (!supabase) return { supabase: null, user: null, error: "Supabase não configurado." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, error: "Entre para continuar." };
  return { supabase, user, error: null };
}

type EnsureProfileResult = {
  ok: boolean;
  message: string | null;
};

async function ensureProfile(user: User): Promise<EnsureProfileResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Supabase não configurado." };

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
  return data ? { ok: true, message: null } : { ok: false, message: "Não foi possível preparar seu perfil." };
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
  supabase,
  actorId,
  ownerId,
  carId,
  type,
  title,
  body,
  dedupe = true,
}: {
  supabase: ServerSupabaseClient;
  actorId: string;
  ownerId: string | null | undefined;
  carId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  dedupe?: boolean;
}) {
  if (!ownerId || ownerId === actorId) {
    console.warn("[notification-rpc]", "notifyCarOwner.skipped", {
      actorId,
      recipientId: ownerId ?? null,
      carId,
      notificationType: type,
      reason: !ownerId ? "missing-owner" : "self-action",
    });
    return;
  }

  const notificationId = await createNotification(supabase, {
    actorId,
    recipientId: ownerId,
    type,
    carId,
    title,
    body,
    dedupe,
    source: "notifyCarOwner",
  });
  if (notificationId) revalidatePath("/notificacoes");
}

async function notifyProfileFollow({
  supabase,
  actorId,
  profileId,
  actorName,
}: {
  supabase: ServerSupabaseClient;
  actorId: string;
  profileId: string;
  actorName: string;
}) {
  if (profileId === actorId) {
    console.warn("[notification-rpc]", "notifyProfileFollow.skipped", {
      actorId,
      recipientId: profileId,
      carId: null,
      notificationType: "follow",
      reason: "self-action",
    });
    return;
  }

  const notificationId = await createNotification(supabase, {
    actorId,
    recipientId: profileId,
    type: "follow",
    carId: null,
    title: `${actorName} comecou a seguir voce`,
    body: "Seu perfil ganhou um novo seguidor.",
    dedupe: true,
    source: "notifyProfileFollow",
  });
  if (notificationId) revalidatePath("/notificacoes");
}

async function readCarSocialCounts(supabase: ServerSupabaseClient, carId: string) {
  const { data } = await supabase
    .from("cars")
    .select("likes_count, saves_count, views_count, project_followers_count")
    .eq("id", carId)
    .maybeSingle();

  return {
    likesCount: data?.likes_count ?? 0,
    savesCount: data?.saves_count ?? 0,
    viewsCount: data?.views_count ?? 0,
    followersCount: data?.project_followers_count ?? 0,
  };
}

async function verifySocialRow(
  supabase: ServerSupabaseClient,
  table: "car_likes" | "car_saves" | "project_follows",
  carId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from(table)
    .select("car_id")
    .eq("car_id", carId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logSupabaseActionError(`${table}.select`, { carId, userId }, error);
    return { ok: false, exists: false, message: formatSupabaseActionError(`${table}.select`, error) };
  }

  return { ok: true, exists: Boolean(data), message: null };
}

function revalidateProjectSocialPaths(slug?: string | null) {
  revalidatePath("/");
  revalidatePath("/explorar");
  revalidatePath("/rankings");
  revalidatePath("/garagem");
  revalidatePath("/perfil");
  if (slug) {
    revalidatePath(`/projeto/${slug}`);
    revalidatePath(`/carros/${slug}`);
  }
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

  const recipients = ((follows ?? []) as Array<{ user_id: string }>)
    .map((follow) => follow.user_id)
    .filter((userId) => userId !== ownerId);

  const notificationResults = await Promise.all(
    recipients.map((recipientId) =>
      supabase.rpc("create_notification", {
        p_recipient_id: recipientId,
        p_notification_type: "project_update",
        p_car_id: carId,
        p_notification_title: `${carName} publicou uma nova evolução`,
        p_notification_body: updateTitle,
        p_dedupe: false,
      })
    )
  );

  notificationResults.forEach((result, index) => {
    if (result.error) {
      logNotificationRpcError(
        "notifyProjectFollowers",
        { recipientId: recipients[index], type: "project_update", carId, dedupe: false },
        result.error
      );
    }
  });

  if (notificationResults.some((result) => result.data)) revalidatePath("/notificacoes");
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
  let createdSlug = "";

  try {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) return { status: "error", message: auth.error ?? "Erro de autenticacao." };

  const profile = await ensureProfile(auth.user);
  if (!profile.ok) {
    return { status: "error", message: profile.message ?? "Não foi possível preparar seu perfil." };
  }

  const name = text(formData, "name");
  const brand = text(formData, "brand");
  const model = text(formData, "model");
  const year = integer(formData, "year");

  if (!name || !brand || !model || !year) {
    return { status: "error", message: "Preencha nome do projeto, marca, modelo e ano." };
  }

  const slug = await uniqueCarSlug(normalizeSlug(`${name}-${brand}-${model}-${year}`));
  const payload = buildCarPayload(formData, auth.user.id, slug);
  const { data: car, error } = await auth.supabase.from("cars").insert(payload).select("id, slug, main_photo_url, photo_urls").maybeSingle();

  if (error || !car) {
    logProjectCreationError("insert cars", error ?? "Insert em cars nao retornou linha.");
    return {
      status: "error",
      message: projectCreationErrorMessage(error, "Nao foi possivel criar o carro."),
    };
  }

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
  createdSlug = car.slug;
  } catch (error) {
    console.error("Erro ao criar projeto:", error);
    return {
      status: "error",
      message: projectCreationErrorMessage(error),
    };
  }

  redirect(`/projeto/${createdSlug}`);
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
  logSocialActionDiagnostic("toggleLikeAction.enter", { carId });
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) return { ok: false, message: auth.error ?? "Entre para curtir.", active: false };
  logSocialActionDiagnostic("toggleLikeAction.auth", { carId, actorId: auth.user.id });
  await ensureProfile(auth.user);

  const { data: car, error: carError } = await auth.supabase
    .from("cars")
    .select("id, slug, owner_id, name")
    .eq("id", carId)
    .maybeSingle();

  if (carError || !car) {
    return { ok: false, message: carError?.message ?? "Projeto não encontrado.", active: false };
  }

  const { data: existing, error: existingError } = await auth.supabase
    .from("car_likes")
    .select("car_id")
    .eq("car_id", carId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (existingError) {
    logSupabaseActionError("car_likes.select", { carId, userId: auth.user.id }, existingError);
    return { ok: false, message: formatSupabaseActionError("car_likes.select", existingError), active: false };
  }

  if (existing) {
    const { error } = await auth.supabase.from("car_likes").delete().eq("car_id", carId).eq("user_id", auth.user.id);
    if (error) {
      logSupabaseActionError("car_likes.delete", { carId, userId: auth.user.id }, error);
      return { ok: false, message: formatSupabaseActionError("car_likes.delete", error), active: true };
    }
    const verification = await verifySocialRow(auth.supabase, "car_likes", carId, auth.user.id);
    if (!verification.ok || verification.exists) {
      const message = verification.message ?? "car_likes.delete falhou: registro ainda existe apos delete.";
      console.error("[social-action] car_likes.delete.verify", { carId, userId: auth.user.id, message });
      return { ok: false, message, active: true };
    }
    const counts = await readCarSocialCounts(auth.supabase, carId);
    revalidateProjectSocialPaths(car.slug);
    return { ok: true, active: false, ...counts };
  }

  const { error } = await auth.supabase.from("car_likes").insert({ car_id: carId, user_id: auth.user.id });
  if (!error && car) {
    await notifyCarOwner({
      supabase: auth.supabase,
      actorId: auth.user.id,
      ownerId: car.owner_id,
      carId,
      type: "project_like",
      title: `${car.name} recebeu uma curtida`,
      body: "Alguém curtiu seu projeto.",
    });
  }
  if (error) {
    logSupabaseActionError("car_likes.insert", { carId, userId: auth.user.id }, error);
    return { ok: false, message: formatSupabaseActionError("car_likes.insert", error), active: false };
  }

  const verification = await verifySocialRow(auth.supabase, "car_likes", carId, auth.user.id);
  if (!verification.ok || !verification.exists) {
    const message = verification.message ?? "car_likes.insert falhou: registro nao foi encontrado apos insert.";
    console.error("[social-action] car_likes.insert.verify", { carId, userId: auth.user.id, message });
    return { ok: false, message, active: false };
  }

  const counts = await readCarSocialCounts(auth.supabase, carId);
  revalidateProjectSocialPaths(car.slug);
  return { ok: true, active: true, ...counts };
}

export async function toggleSaveAction(carId: string) {
  logSocialActionDiagnostic("toggleSaveAction.enter", { carId });
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) return { ok: false, message: auth.error ?? "Entre para salvar.", active: false };
  logSocialActionDiagnostic("toggleSaveAction.auth", { carId, actorId: auth.user.id });
  await ensureProfile(auth.user);

  const { data: car, error: carError } = await auth.supabase
    .from("cars")
    .select("id, slug, owner_id, name")
    .eq("id", carId)
    .maybeSingle();

  if (carError || !car) {
    return { ok: false, message: carError?.message ?? "Projeto não encontrado.", active: false };
  }

  const { data: existing, error: existingError } = await auth.supabase
    .from("car_saves")
    .select("car_id")
    .eq("car_id", carId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (existingError) {
    logSupabaseActionError("car_saves.select", { carId, userId: auth.user.id }, existingError);
    return { ok: false, message: formatSupabaseActionError("car_saves.select", existingError), active: false };
  }

  if (existing) {
    const { error } = await auth.supabase.from("car_saves").delete().eq("car_id", carId).eq("user_id", auth.user.id);
    if (error) {
      logSupabaseActionError("car_saves.delete", { carId, userId: auth.user.id }, error);
      return { ok: false, message: formatSupabaseActionError("car_saves.delete", error), active: true };
    }
    const verification = await verifySocialRow(auth.supabase, "car_saves", carId, auth.user.id);
    if (!verification.ok || verification.exists) {
      const message = verification.message ?? "car_saves.delete falhou: registro ainda existe apos delete.";
      console.error("[social-action] car_saves.delete.verify", { carId, userId: auth.user.id, message });
      return { ok: false, message, active: true };
    }
    const counts = await readCarSocialCounts(auth.supabase, carId);
    revalidateProjectSocialPaths(car.slug);
    return { ok: true, active: false, ...counts };
  }

  const { error } = await auth.supabase.from("car_saves").insert({ car_id: carId, user_id: auth.user.id });
  if (!error && car) {
    await notifyCarOwner({
      supabase: auth.supabase,
      actorId: auth.user.id,
      ownerId: car.owner_id,
      carId,
      type: "project_save",
      title: `${car.name} foi salvo`,
      body: "Alguém salvou seu projeto na garagem.",
    });
  }
  if (error) {
    logSupabaseActionError("car_saves.insert", { carId, userId: auth.user.id }, error);
    return { ok: false, message: formatSupabaseActionError("car_saves.insert", error), active: false };
  }

  const verification = await verifySocialRow(auth.supabase, "car_saves", carId, auth.user.id);
  if (!verification.ok || !verification.exists) {
    const message = verification.message ?? "car_saves.insert falhou: registro nao foi encontrado apos insert.";
    console.error("[social-action] car_saves.insert.verify", { carId, userId: auth.user.id, message });
    return { ok: false, message, active: false };
  }

  const counts = await readCarSocialCounts(auth.supabase, carId);
  revalidateProjectSocialPaths(car.slug);
  return { ok: true, active: true, ...counts };
}

export async function toggleFollowUserAction(profileId: string) {
  logSocialActionDiagnostic("toggleFollowUserAction.enter", { recipientId: profileId });
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) {
    return { ok: false, message: auth.error ?? "Entre para seguir perfis.", active: false };
  }
  logSocialActionDiagnostic("toggleFollowUserAction.auth", { actorId: auth.user.id, recipientId: profileId });
  await ensureProfile(auth.user);

  if (!profileId || profileId === auth.user.id) {
    return { ok: false, message: "Você não pode seguir o próprio perfil.", active: false };
  }

  const { data: existing, error: existingError } = await auth.supabase
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", auth.user.id)
    .eq("following_id", profileId)
    .maybeSingle();

  if (existingError) {
    logSupabaseActionError("user_follows.select", { followerId: auth.user.id, followingId: profileId }, existingError);
    return { ok: false, message: formatSupabaseActionError("user_follows.select", existingError), active: false };
  }

  if (existing) {
    const { error } = await auth.supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", auth.user.id)
      .eq("following_id", profileId);
    if (error) {
      logSupabaseActionError("user_follows.delete", { followerId: auth.user.id, followingId: profileId }, error);
    }
    revalidatePath("/garagem");
    revalidatePath("/perfil");
    return {
      ok: !error,
      message: error ? formatSupabaseActionError("user_follows.delete", error) : undefined,
      active: false,
    };
  }

  const { error } = await auth.supabase.from("user_follows").insert({
    follower_id: auth.user.id,
    following_id: profileId,
  });

  if (error) {
    logSupabaseActionError("user_follows.insert", { followerId: auth.user.id, followingId: profileId }, error);
  }

  if (!error) {
    const { data: actorProfile } = await auth.supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", auth.user.id)
      .maybeSingle();

    await notifyProfileFollow({
      supabase: auth.supabase,
      actorId: auth.user.id,
      profileId,
      actorName: actorProfile?.display_name ?? actorProfile?.username ?? "Alguem",
    });
  }

  revalidatePath("/garagem");
  revalidatePath("/perfil");
  return {
    ok: !error,
    message: error ? formatSupabaseActionError("user_follows.insert", error) : undefined,
    active: !error,
  };
}

export async function toggleProjectFollowAction(carId: string) {
  logSocialActionDiagnostic("toggleProjectFollowAction.enter", { carId });
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) {
    return { ok: false, message: auth.error ?? "Entre para seguir projetos.", active: false };
  }
  logSocialActionDiagnostic("toggleProjectFollowAction.auth", { carId, actorId: auth.user.id });
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

  const { data: existing, error: existingError } = await auth.supabase
    .from("project_follows")
    .select("id")
    .eq("car_id", carId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (existingError) {
    logSupabaseActionError("project_follows.select", { carId, userId: auth.user.id }, existingError);
    return { ok: false, message: formatSupabaseActionError("project_follows.select", existingError), active: false };
  }

  if (existing) {
    const { error } = await auth.supabase
      .from("project_follows")
      .delete()
      .eq("car_id", carId)
      .eq("user_id", auth.user.id);
    if (error) {
      logSupabaseActionError("project_follows.delete", { carId, userId: auth.user.id }, error);
      return { ok: false, message: formatSupabaseActionError("project_follows.delete", error), active: true };
    }
    const verification = await verifySocialRow(auth.supabase, "project_follows", carId, auth.user.id);
    if (!verification.ok || verification.exists) {
      const message = verification.message ?? "project_follows.delete falhou: registro ainda existe apos delete.";
      console.error("[social-action] project_follows.delete.verify", { carId, userId: auth.user.id, message });
      return { ok: false, message, active: true };
    }
    const counts = await readCarSocialCounts(auth.supabase, carId);
    revalidateProjectSocialPaths(car.slug);
    return { ok: true, active: false, ...counts };
  }

  const { error } = await auth.supabase.from("project_follows").insert({
    car_id: carId,
    user_id: auth.user.id,
  });

  if (!error) {
    await notifyCarOwner({
      supabase: auth.supabase,
      actorId: auth.user.id,
      ownerId: car.owner_id,
      carId,
      type: "project_follow",
      title: `${car.name} ganhou um seguidor`,
      body: "Alguém começou a acompanhar este projeto.",
    });
  }

  if (error) {
    logSupabaseActionError("project_follows.insert", { carId, userId: auth.user.id }, error);
    return { ok: false, message: formatSupabaseActionError("project_follows.insert", error), active: false };
  }

  const verification = await verifySocialRow(auth.supabase, "project_follows", carId, auth.user.id);
  if (!verification.ok || !verification.exists) {
    const message = verification.message ?? "project_follows.insert falhou: registro nao foi encontrado apos insert.";
    console.error("[social-action] project_follows.insert.verify", { carId, userId: auth.user.id, message });
    return { ok: false, message, active: false };
  }

  const counts = await readCarSocialCounts(auth.supabase, carId);
  revalidateProjectSocialPaths(car.slug);
  return { ok: true, active: true, ...counts };
}

export async function incrementViewAction(carId: string, carSlug: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false };

  const { data, error } = await supabase.rpc("increment_car_view", {
    target_car_id: carId,
  });

  if (error) {
    logSupabaseActionError("increment_car_view.rpc", { carId }, error);
    return { ok: false, message: formatSupabaseActionError("increment_car_view.rpc", error) };
  }

  if (!data) {
    const message = "increment_car_view.rpc falhou: nenhuma linha publica foi atualizada.";
    console.error("[social-action] increment_car_view.rpc", { carId, message });
    return { ok: false, message };
  }

  const counts = await readCarSocialCounts(supabase, carId);
  revalidateProjectSocialPaths(carSlug);

  return { ok: true, ...counts };
}

export async function createCommentAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState & { comment?: CarCommentWithAuthor }> {
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

  const { data: comment, error } = await auth.supabase
    .from("car_comments")
    .insert({
      car_id: carId,
      user_id: auth.user.id,
      content,
    })
    .select("*")
    .maybeSingle();

  if (error || !comment) return { status: "error", message: error?.message ?? "Nao foi possivel publicar o comentario." };

  const { data: author } = await auth.supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, city, state, instagram_handle")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (car) {
    await notifyCarOwner({
      supabase: auth.supabase,
      actorId: auth.user.id,
      ownerId: car.owner_id,
      carId,
      type: "project_comment",
      title: `${car.name} recebeu um comentário`,
      body: content.slice(0, 160),
    });
  }
  revalidatePath(`/projeto/${slug}`);
  revalidatePath(`/carros/${slug}`);
  return {
    status: "success",
    message: "Comentario publicado.",
    comment: {
      ...comment,
      author: (author as ProfileSummary | null) ?? null,
    } as CarCommentWithAuthor,
  };
}

export async function deleteCommentAction(commentId: string, carSlug: string) {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) return { ok: false, message: auth.error ?? "Entre para continuar." };

  const { data: comment, error: readError } = await auth.supabase
    .from("car_comments")
    .select("id, user_id, car_id")
    .eq("id", commentId)
    .maybeSingle();

  if (readError) return { ok: false, message: readError.message };
  if (!comment) return { ok: false, message: "Comentario nao encontrado." };

  const { data: car } = await auth.supabase
    .from("cars")
    .select("owner_id")
    .eq("id", comment.car_id)
    .maybeSingle();

  if (comment.user_id !== auth.user.id && car?.owner_id !== auth.user.id) {
    return { ok: false, message: "Voce so pode excluir seus proprios comentarios." };
  }

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

export async function markNotificationsReadAction(notificationIds: string[]) {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) {
    return { ok: false, message: auth.error ?? "Entre para ver notificações." };
  }

  const ids = Array.from(new Set(notificationIds)).filter((id) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  );
  if (!ids.length) return { ok: true };

  const { error } = await auth.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids)
    .eq("user_id", auth.user.id)
    .is("read_at", null);

  revalidatePath("/notificacoes");
  return { ok: !error, message: error?.message };
}
