import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CarCommentRow,
  CarPartRow,
  CarPhotoRow,
  CarRow,
  ProfileRow,
} from "@/lib/types";
import { CAR_CATEGORIES, normalizeSlug } from "@/lib/garage/constants";
import { getSupabaseServerClient } from "./server";

export type QueryResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export type ProfileSummary = Pick<
  ProfileRow,
  "id" | "username" | "display_name" | "avatar_url" | "bio" | "city" | "state"
>;

export type CarCard = CarRow & {
  owner: ProfileSummary | null;
  installed_parts_count: number;
  planned_parts_count: number;
  viewer_has_liked: boolean;
  viewer_has_saved: boolean;
};

export type CarCommentWithAuthor = CarCommentRow & {
  author: ProfileSummary | null;
};

export type CarDetails = CarCard & {
  photos: CarPhotoRow[];
  parts: CarPartRow[];
  comments: CarCommentWithAuthor[];
};

export type ExploreFilters = {
  q?: string;
  brand?: string;
  model?: string;
  category?: string;
  state?: string;
  sort?: "recent" | "likes" | "saves";
  limit?: number;
};

type Client = SupabaseClient;

export { CAR_CATEGORIES, normalizeSlug };

export function parseBuildPartIds(parts: unknown): string[] {
  if (!Array.isArray(parts)) return [];
  return parts.filter((part): part is string => typeof part === "string");
}

function asProfileMap(rows: ProfileSummary[]) {
  const map = new Map<string, ProfileSummary>();
  for (const row of rows) map.set(row.id, row);
  return map;
}

async function getViewerId(supabase: Client) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function fetchProfiles(supabase: Client, ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqueIds.length) return new Map<string, ProfileSummary>();

  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, city, state")
    .in("id", uniqueIds);

  return asProfileMap((data ?? []) as ProfileSummary[]);
}

async function countPartsByCar(supabase: Client, carIds: string[]) {
  const uniqueIds = Array.from(new Set(carIds));
  if (!uniqueIds.length) return new Map<string, { installed: number; planned: number }>();

  const { data } = await supabase
    .from("car_parts")
    .select("car_id, status")
    .in("car_id", uniqueIds);

  const map = new Map<string, { installed: number; planned: number }>();
  for (const id of uniqueIds) map.set(id, { installed: 0, planned: 0 });

  for (const row of (data ?? []) as Array<{ car_id: string; status: string }>) {
    const current = map.get(row.car_id) ?? { installed: 0, planned: 0 };
    if (row.status === "installed") current.installed += 1;
    if (row.status === "planned") current.planned += 1;
    map.set(row.car_id, current);
  }

  return map;
}

async function viewerFlagsByCar(supabase: Client, viewerId: string | null, carIds: string[]) {
  const likes = new Set<string>();
  const saves = new Set<string>();
  const uniqueIds = Array.from(new Set(carIds));

  if (!viewerId || !uniqueIds.length) return { likes, saves };

  const [{ data: likeRows }, { data: saveRows }] = await Promise.all([
    supabase.from("car_likes").select("car_id").eq("user_id", viewerId).in("car_id", uniqueIds),
    supabase.from("car_saves").select("car_id").eq("user_id", viewerId).in("car_id", uniqueIds),
  ]);

  for (const row of (likeRows ?? []) as Array<{ car_id: string }>) likes.add(row.car_id);
  for (const row of (saveRows ?? []) as Array<{ car_id: string }>) saves.add(row.car_id);

  return { likes, saves };
}

async function hydrateCards(supabase: Client, rows: CarRow[]): Promise<CarCard[]> {
  const viewerId = await getViewerId(supabase);
  const profileMap = await fetchProfiles(
    supabase,
    rows.map((row) => row.owner_id)
  );
  const partCounts = await countPartsByCar(
    supabase,
    rows.map((row) => row.id)
  );
  const flags = await viewerFlagsByCar(
    supabase,
    viewerId,
    rows.map((row) => row.id)
  );

  return rows.map((row) => {
    const counts = partCounts.get(row.id) ?? { installed: 0, planned: 0 };
    return {
      ...row,
      owner: profileMap.get(row.owner_id) ?? null,
      installed_parts_count: counts.installed,
      planned_parts_count: counts.planned,
      viewer_has_liked: flags.likes.has(row.id),
      viewer_has_saved: flags.saves.has(row.id),
    };
  });
}

export async function qCarsLite(
  supabase: Client
): Promise<QueryResult<Array<Pick<CarRow, "id" | "slug" | "name" | "brand" | "model" | "year" | "category">>>> {
  const { data, error } = await supabase
    .from("cars")
    .select("id, slug, name, brand, model, year, category")
    .eq("is_public", true)
    .order("brand", { ascending: true })
    .order("model", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Array<Pick<CarRow, "id" | "slug" | "name" | "brand" | "model" | "year" | "category">>, error: null };
}

export async function qProfileById(
  supabase: Client,
  userId: string
): Promise<QueryResult<ProfileRow>> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "profile_not_found" };
  return { data: data as ProfileRow, error: null };
}

export async function qProfileByUsername(
  supabase: Client,
  username: string
): Promise<QueryResult<ProfileRow>> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "profile_not_found" };
  return { data: data as ProfileRow, error: null };
}

export async function getCurrentProfile() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { userId: null, profile: null, error: "supabase_not_configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, profile: null, error: "not_authenticated" };

  const profile = await qProfileById(supabase, user.id);
  return { userId: user.id, profile: profile.data, error: profile.error };
}

export async function qExploreCars(filters: ExploreFilters = {}): Promise<QueryResult<CarCard[]>> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { data: [], error: null };

  let query = supabase
    .from("cars")
    .select("*")
    .eq("is_public", true)
    .limit(filters.limit ?? 48);

  if (filters.q?.trim()) {
    const term = filters.q.trim().replace(/[%_,]/g, "");
    query = query.or(`name.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%,category.ilike.%${term}%`);
  }

  if (filters.brand?.trim()) query = query.ilike("brand", `%${filters.brand.trim()}%`);
  if (filters.model?.trim()) query = query.ilike("model", `%${filters.model.trim()}%`);
  if (filters.category?.trim()) query = query.eq("category", filters.category.trim());
  if (filters.state?.trim()) query = query.ilike("state", filters.state.trim());

  if (filters.sort === "likes") {
    query = query.order("likes_count", { ascending: false }).order("created_at", { ascending: false });
  } else if (filters.sort === "saves") {
    query = query.order("saves_count", { ascending: false }).order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };

  const cards = await hydrateCards(supabase, (data ?? []) as CarRow[]);
  return { data: cards, error: null };
}

export async function qCarsByOwner(
  ownerId: string,
  includePrivate = false
): Promise<QueryResult<CarCard[]>> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { data: [], error: null };

  let query = supabase.from("cars").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false });
  if (!includePrivate) query = query.eq("is_public", true);

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  const cards = await hydrateCards(supabase, (data ?? []) as CarRow[]);
  return { data: cards, error: null };
}

export async function qSavedCars(userId: string): Promise<QueryResult<CarCard[]>> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { data: [], error: null };

  const { data: saves, error } = await supabase
    .from("car_saves")
    .select("car_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return { data: null, error: error.message };

  const ids = ((saves ?? []) as Array<{ car_id: string }>).map((save) => save.car_id);
  if (!ids.length) return { data: [], error: null };

  const { data: cars, error: carsError } = await supabase
    .from("cars")
    .select("*")
    .in("id", ids)
    .eq("is_public", true);
  if (carsError) return { data: null, error: carsError.message };

  const cards = await hydrateCards(supabase, (cars ?? []) as CarRow[]);
  return { data: cards, error: null };
}

export async function qCarBySlug(slug: string): Promise<QueryResult<CarDetails>> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { data: null, error: "supabase_not_configured" };

  const { data: row, error } = await supabase.from("cars").select("*").eq("slug", slug).maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!row) return { data: null, error: "car_not_found" };

  const [card] = await hydrateCards(supabase, [row as CarRow]);

  const [{ data: photos }, { data: parts }, { data: comments }] = await Promise.all([
    supabase.from("car_photos").select("*").eq("car_id", card.id).order("sort_order", { ascending: true }),
    supabase.from("car_parts").select("*").eq("car_id", card.id).order("status", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("car_comments").select("*").eq("car_id", card.id).order("created_at", { ascending: false }).limit(50),
  ]);

  const commentRows = (comments ?? []) as CarCommentRow[];
  const commentAuthorMap = await fetchProfiles(
    supabase,
    commentRows.map((comment) => comment.user_id)
  );

  return {
    data: {
      ...card,
      photos: (photos ?? []) as CarPhotoRow[],
      parts: (parts ?? []) as CarPartRow[],
      comments: commentRows.map((comment) => ({
        ...comment,
        author: commentAuthorMap.get(comment.user_id) ?? null,
      })),
    },
    error: null,
  };
}

export async function qRankingCars(): Promise<QueryResult<{
  mostLiked: CarCard[];
  mostSaved: CarCard[];
  newest: CarCard[];
}>> {
  const [mostLiked, mostSaved, newest] = await Promise.all([
    qExploreCars({ sort: "likes", limit: 12 }),
    qExploreCars({ sort: "saves", limit: 12 }),
    qExploreCars({ sort: "recent", limit: 12 }),
  ]);

  if (mostLiked.error) return { data: null, error: mostLiked.error };
  if (mostSaved.error) return { data: null, error: mostSaved.error };
  if (newest.error) return { data: null, error: newest.error };

  return {
    data: {
      mostLiked: mostLiked.data ?? [],
      mostSaved: mostSaved.data ?? [],
      newest: newest.data ?? [],
    },
    error: null,
  };
}

export async function getBuildsPublicas() {
  return qExploreCars({ sort: "recent", limit: 24 });
}

export async function getBuildById(id: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { data: null, error: "supabase_not_configured" };
  const { data, error } = await supabase.from("cars").select("*").eq("id", id).maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data, error: data ? null : "car_not_found" };
}

export async function getPerfilUsuario(username: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { data: null, error: "supabase_not_configured" };
  return qProfileByUsername(supabase, username);
}

export async function getBuildsDoUsuario(userId: string, incluirPrivadas = false) {
  return qCarsByOwner(userId, incluirPrivadas);
}
