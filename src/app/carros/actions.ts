"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import type { CarPartStatus } from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeSlug } from "@/lib/garage/constants";

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
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? value : null;
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
        const status: CarPartStatus = item.status === "planned" ? "planned" : "installed";
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
        };
      })
      .filter((part) => part.name.length > 0);
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
  if (!supabase) return { supabase: null, user: null, error: "Supabase nao configurado." };

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
    .select("id, username, display_name, avatar_url, bio, city, state, is_saves_public, cars_count, followers_count, following_count, created_at, updated_at")
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
    .select("id, username, display_name, avatar_url, bio, city, state, is_saves_public, cars_count, followers_count, following_count, created_at, updated_at")
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

function buildCarPayload(formData: FormData, ownerId: string, slug: string) {
  const name = text(formData, "name");
  const brand = text(formData, "brand");
  const model = text(formData, "model");
  const year = integer(formData, "year");
  const category = text(formData, "category");
  const mainPhoto = nullableText(formData, "main_photo_url");
  const photos = parseStringArray(text(formData, "photo_urls_json"));
  const photoUrls = Array.from(new Set([mainPhoto, ...photos].filter((url): url is string => Boolean(url))));

  return {
    owner_id: ownerId,
    slug,
    name,
    brand,
    model,
    year: year ?? new Date().getFullYear(),
    version: nullableText(formData, "version"),
    category: category || "Projeto automotivo",
    state: nullableText(formData, "state"),
    city: nullableText(formData, "city"),
    description: nullableText(formData, "description"),
    main_photo_url: mainPhoto,
    photo_urls: photoUrls,
    engine: nullableText(formData, "engine"),
    power_cv: integer(formData, "power_cv"),
    fuel_type: nullableText(formData, "fuel_type"),
    transmission: nullableText(formData, "transmission"),
    drivetrain: nullableText(formData, "drivetrain"),
    suspension: nullableText(formData, "suspension"),
    wheels: nullableText(formData, "wheels"),
    tires: nullableText(formData, "tires"),
    brakes: nullableText(formData, "brakes"),
    is_public: formData.get("is_public") !== "false",
  };
}

async function replacePhotos(carId: string, mainPhotoUrl: string | null, photoUrls: string[]) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  await supabase.from("car_photos").delete().eq("car_id", carId);
  const urls = Array.from(new Set([mainPhotoUrl, ...photoUrls].filter((url): url is string => Boolean(url))));
  if (!urls.length) return;

  await supabase.from("car_photos").insert(
    urls.map((url, index) => ({
      car_id: carId,
      url,
      sort_order: index,
      alt: index === 0 ? "Foto principal do carro" : "Foto do projeto",
    }))
  );
}

async function replaceParts(carId: string, parts: PartInput[]) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  await supabase.from("car_parts").delete().eq("car_id", carId);
  if (!parts.length) return;

  await supabase.from("car_parts").insert(
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
    }))
  );
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
    is_saves_public: formData.get("is_saves_public") === "true",
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

  if (!name || !brand || !model || !year) {
    return { status: "error", message: "Preencha nome do projeto, marca, modelo e ano." };
  }

  const slug = await uniqueCarSlug(normalizeSlug(`${name}-${brand}-${model}-${year}`));
  const payload = buildCarPayload(formData, auth.user.id, slug);
  const { data: car, error } = await auth.supabase.from("cars").insert(payload).select("id, slug, main_photo_url, photo_urls").maybeSingle();

  if (error || !car) return { status: "error", message: error?.message ?? "Nao foi possivel criar o carro." };

  const photoUrls = parseStringArray(text(formData, "photo_urls_json"));
  const parts = parseParts(text(formData, "parts_json"));
  await replacePhotos(car.id, car.main_photo_url, photoUrls);
  await replaceParts(car.id, parts);

  revalidatePath("/");
  revalidatePath("/explorar");
  revalidatePath("/garagem");
  redirect(`/carros/${car.slug}`);
}

export async function updateCarAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) return { status: "error", message: auth.error ?? "Erro de autenticacao." };

  const carId = text(formData, "car_id");
  if (!carId) return { status: "error", message: "Carro nao encontrado." };

  const { data: current } = await auth.supabase
    .from("cars")
    .select("id, owner_id, slug")
    .eq("id", carId)
    .maybeSingle();

  if (!current || current.owner_id !== auth.user.id) {
    return { status: "error", message: "Voce so pode editar seus proprios carros." };
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
    .select("id, slug, main_photo_url")
    .maybeSingle();

  if (error || !car) return { status: "error", message: error?.message ?? "Nao foi possivel salvar." };

  const photoUrls = parseStringArray(text(formData, "photo_urls_json"));
  const parts = parseParts(text(formData, "parts_json"));
  await replacePhotos(car.id, car.main_photo_url, photoUrls);
  await replaceParts(car.id, parts);

  revalidatePath("/");
  revalidatePath("/explorar");
  revalidatePath("/garagem");
  revalidatePath(`/carros/${current.slug}`);
  revalidatePath(`/carros/${car.slug}`);
  redirect(`/carros/${car.slug}`);
}

export async function toggleLikeAction(carId: string) {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) return { ok: false, message: auth.error ?? "Entre para curtir.", active: false };
  await ensureProfile(auth.user);

  const { data: existing } = await auth.supabase
    .from("car_likes")
    .select("car_id")
    .eq("car_id", carId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (existing) {
    await auth.supabase.from("car_likes").delete().eq("car_id", carId).eq("user_id", auth.user.id);
    revalidatePath("/explorar");
    return { ok: true, active: false };
  }

  const { error } = await auth.supabase.from("car_likes").insert({ car_id: carId, user_id: auth.user.id });
  revalidatePath("/explorar");
  return { ok: !error, message: error?.message, active: !error };
}

export async function toggleSaveAction(carId: string) {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) return { ok: false, message: auth.error ?? "Entre para salvar.", active: false };
  await ensureProfile(auth.user);

  const { data: existing } = await auth.supabase
    .from("car_saves")
    .select("car_id")
    .eq("car_id", carId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (existing) {
    await auth.supabase.from("car_saves").delete().eq("car_id", carId).eq("user_id", auth.user.id);
    revalidatePath("/garagem");
    return { ok: true, active: false };
  }

  const { error } = await auth.supabase.from("car_saves").insert({ car_id: carId, user_id: auth.user.id });
  revalidatePath("/garagem");
  return { ok: !error, message: error?.message, active: !error };
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

  const { error } = await auth.supabase.from("car_comments").insert({
    car_id: carId,
    user_id: auth.user.id,
    content,
  });

  if (error) return { status: "error", message: error.message };
  revalidatePath(`/carros/${slug}`);
  return { status: "success", message: "Comentario publicado." };
}

export async function deleteCommentAction(commentId: string, carSlug: string) {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) return { ok: false, message: auth.error ?? "Entre para continuar." };

  const { error } = await auth.supabase.from("car_comments").delete().eq("id", commentId);
  revalidatePath(`/carros/${carSlug}`);
  return { ok: !error, message: error?.message };
}
