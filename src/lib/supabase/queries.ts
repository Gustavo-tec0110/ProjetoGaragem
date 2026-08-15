import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

import type {
  CarBuildUpdateRow,
  CarCatalogModelRow,
  CarCatalogVersionRow,
  CarCommentRow,
  CarExpenseRow,
  CarPartRow,
  CarPhotoRow,
  CarRow,
  NotificationRow,
  ProfileRow,
  Database,
} from "@/lib/types";
import {
  FALLBACK_CAR_CATALOG,
  type CarCatalogVersion,
} from "@/lib/car-catalog";
import { serverLog } from "@/lib/server-log";
import { logPerformance, performanceTimer } from "@/lib/performance";
import { PROJECT_CATALOG_CACHE_TAG, PUBLIC_PROFILE_CACHE_TAG } from "@/lib/projects/cache";
import { getSupabasePublicClient, getSupabaseServerClient } from "./server";
import { getSupabaseServerUser } from "./auth-server";

export type QueryResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export type ProfileSummary = Pick<
  ProfileRow,
  | "id"
  | "username"
  | "display_name"
  | "avatar_url"
  | "bio"
  | "city"
  | "state"
  | "instagram_handle"
>;

export type CarCard = CarRow & {
  owner: ProfileSummary | null;
  installed_parts_count: number;
  planned_parts_count: number;
  estimated_cost: number;
  total_invested: number;
  updates_count: number;
  last_update_at: string | null;
  viewer_has_liked: boolean;
  viewer_has_saved: boolean;
  viewer_has_followed: boolean;
};

export type CarCommentWithAuthor = CarCommentRow & {
  author: ProfileSummary | null;
};

export type CarDetails = CarCard & {
  photos: CarPhotoRow[];
  parts: CarPartRow[];
  comments: CarCommentWithAuthor[];
  updates: CarBuildUpdateRow[];
  expenses: CarExpenseRow[];
};

export type NotificationWithContext = NotificationRow & {
  actor: ProfileSummary | null;
  car: Pick<CarRow, "id" | "slug" | "name" | "brand" | "model" | "main_photo_url"> | null;
};

export type ExploreFilters = {
  q?: string;
  brand?: string;
  model?: string;
  year?: string;
  fuel?: string;
  induction?: string;
  drivetrain?: string;
  category?: string;
  tag?: string;
  state?: string;
  engine?: string;
  sort?: "relevance" | "recent" | "popular" | "likes" | "comments" | "saves" | "views" | "updated" | "hot";
  limit?: number;
};

export type ProjectSearchSuggestion = {
  term: string;
  source: string;
  rank: number;
  href?: string;
};

type Client = SupabaseClient<Database>;

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function normalizeCarRow(row: CarRow): CarRow {
  return {
    ...row,
    photo_urls: stringArray(row.photo_urls),
    tags: stringArray(row.tags),
  };
}
function normalizeSearchTerm(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/#/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function carSearchText(row: CarRow) {
  return normalizeSearchTerm(
    [
      row.name,
      row.brand,
      row.model,
      String(row.year),
      row.version,
      row.category,
      row.engine,
      row.factory_engine,
      row.current_induction,
      row.fuel_type,
      row.drivetrain,
      row.description,
      row.project_goal,
      ...stringArray(row.tags),
    ].join(" ")
  );
}

function carSearchRank(row: CarRow, query: string) {
  const normalizedQuery = normalizeSearchTerm(query);
  const queryWithoutHash = normalizedQuery.replace(/^#+/, "");
  const tags = stringArray(row.tags).map(normalizeSearchTerm);
  let rank =
    row.project_followers_count * 0.5 +
    row.likes_count * 0.35 +
    row.comments_count * 0.25 +
    row.views_count * 0.03;

  if (normalizeSearchTerm(row.name) === normalizedQuery) rank += 120;
  if (normalizeSearchTerm(row.model) === normalizedQuery) rank += 100;
  if (normalizeSearchTerm(row.brand) === normalizedQuery) rank += 90;
  if (String(row.year) === normalizedQuery) rank += 80;
  if (tags.some((tag) => tag === queryWithoutHash)) rank += 100;
  if (normalizeSearchTerm(row.name).split(" ").some((word) => word.startsWith(normalizedQuery))) rank += 70;
  if (normalizeSearchTerm(row.model).split(" ").some((word) => word.startsWith(normalizedQuery))) rank += 64;
  if (normalizeSearchTerm(row.brand).split(" ").some((word) => word.startsWith(normalizedQuery))) rank += 52;
  if (normalizeSearchTerm(row.name).includes(normalizedQuery)) rank += 40;
  if (normalizeSearchTerm(row.model).includes(normalizedQuery)) rank += 36;
  if (normalizeSearchTerm(row.brand).includes(normalizedQuery)) rank += 28;
  if (normalizeSearchTerm(row.engine).includes(normalizedQuery)) rank += 26;
  if (tags.some((tag) => tag.includes(queryWithoutHash))) rank += 34;
  if (normalizeSearchTerm(row.description).includes(normalizedQuery)) rank += 10;

  return rank;
}

function cleanLike(value: string) {
  return value.trim().replace(/[%_,]/g, "");
}

function normalizeUpdateRow(row: CarBuildUpdateRow): CarBuildUpdateRow {
  return {
    ...row,
    photo_urls: stringArray(row.photo_urls),
  };
}

function asProfileMap(rows: ProfileSummary[]) {
  const map = new Map<string, ProfileSummary>();
  for (const row of rows) map.set(row.id, row);
  return map;
}

function isMissingNotificationsTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    (message.includes("notifications") &&
      (message.includes("schema cache") ||
        message.includes("could not find") ||
        message.includes("relation") ||
        message.includes("does not exist")))
  );
}

function logNotificationQueryError(action: string, error: { code?: string; message?: string } | null) {
  if (!error) return;
  serverLog.error("notification-query", {
    action,
    code: error.code,
    message: error.message,
  });
}

async function getViewerId() {
  const startedAt = performance.now();
  const user = await getSupabaseServerUser();
  logPerformance("auth", "queries.getViewerId", performance.now() - startedAt, {
    authenticated: Boolean(user),
  });
  return user?.id ?? null;
}

async function fetchProfiles(supabase: Client, ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqueIds.length) return new Map<string, ProfileSummary>();

  const { data } = await supabase
    .from("public_profiles")
    .select("id, username, display_name, avatar_url, bio, city, state, instagram_handle")
    .in("id", uniqueIds);

  return asProfileMap((data ?? []) as ProfileSummary[]);
}

async function aggregatePartsByCar(supabase: Client, carIds: string[]) {
  const uniqueIds = Array.from(new Set(carIds));
  if (!uniqueIds.length) {
    return new Map<string, { installed: number; planned: number; estimatedCost: number }>();
  }

  const { data } = await supabase
    .from("car_parts")
    .select("car_id, status, price_estimate")
    .in("car_id", uniqueIds);

  const map = new Map<string, { installed: number; planned: number; estimatedCost: number }>();
  for (const id of uniqueIds) map.set(id, { installed: 0, planned: 0, estimatedCost: 0 });

  for (const row of (data ?? []) as Array<{ car_id: string; status: string; price_estimate: number | null }>) {
    const current = map.get(row.car_id) ?? { installed: 0, planned: 0, estimatedCost: 0 };
    if (row.status === "installed") current.installed += 1;
    if (row.status === "planned") current.planned += 1;
    current.estimatedCost += Math.max(0, row.price_estimate ?? 0);
    map.set(row.car_id, current);
  }

  return map;
}

async function aggregateExpensesByCar(supabase: Client, carIds: string[]) {
  const uniqueIds = Array.from(new Set(carIds));
  if (!uniqueIds.length) {
    return new Map<string, { totalInvested: number }>();
  }

  const { data } = await supabase
    .from("car_expenses")
    .select("car_id, amount")
    .in("car_id", uniqueIds);

  const map = new Map<string, { totalInvested: number }>();
  for (const id of uniqueIds) map.set(id, { totalInvested: 0 });

  for (const row of (data ?? []) as Array<{ car_id: string; amount: number }>) {
    const current = map.get(row.car_id) ?? { totalInvested: 0 };
    current.totalInvested += Math.max(0, row.amount);
    map.set(row.car_id, current);
  }

  return map;
}

async function aggregateUpdatesByCar(supabase: Client, carIds: string[]) {
  const uniqueIds = Array.from(new Set(carIds));
  if (!uniqueIds.length) {
    return new Map<string, { updatesCount: number; lastUpdateAt: string | null }>();
  }

  const { data } = await supabase
    .from("car_build_updates")
    .select("car_id, happened_at")
    .in("car_id", uniqueIds);

  const map = new Map<string, { updatesCount: number; lastUpdateAt: string | null }>();
  for (const id of uniqueIds) map.set(id, { updatesCount: 0, lastUpdateAt: null });

  for (const row of (data ?? []) as Array<{ car_id: string; happened_at: string }>) {
    const current = map.get(row.car_id) ?? { updatesCount: 0, lastUpdateAt: null };
    current.updatesCount += 1;
    if (!current.lastUpdateAt || row.happened_at > current.lastUpdateAt) {
      current.lastUpdateAt = row.happened_at;
    }
    map.set(row.car_id, current);
  }

  return map;
}

async function viewerFlagsByCar(supabase: Client, viewerId: string | null, carIds: string[]) {
  const likes = new Set<string>();
  const saves = new Set<string>();
  const follows = new Set<string>();
  const uniqueIds = Array.from(new Set(carIds));

  if (!viewerId || !uniqueIds.length) return { likes, saves, follows };

  const [{ data: likeRows }, { data: saveRows }, { data: followRows }] = await Promise.all([
    supabase.from("car_likes").select("car_id").eq("user_id", viewerId).in("car_id", uniqueIds),
    supabase.from("car_saves").select("car_id").eq("user_id", viewerId).in("car_id", uniqueIds),
    supabase.from("project_follows").select("car_id").eq("user_id", viewerId).in("car_id", uniqueIds),
  ]);

  for (const row of (likeRows ?? []) as Array<{ car_id: string }>) likes.add(row.car_id);
  for (const row of (saveRows ?? []) as Array<{ car_id: string }>) saves.add(row.car_id);
  for (const row of (followRows ?? []) as Array<{ car_id: string }>) follows.add(row.car_id);

  return { likes, saves, follows };
}

async function hydrateCards(
  supabase: Client,
  rows: CarRow[],
  viewerId: string | null = null
): Promise<CarCard[]> {
  const timer = performanceTimer("supabase", "hydrateCards", { rows: rows.length });
  const carIds = rows.map((row) => row.id);
  const aggregateStartedAt = performance.now();
  const [profileMap, partCounts, expensesByCar, updatesByCar] = await Promise.all([
    fetchProfiles(
      supabase,
      rows.map((row) => row.owner_id)
    ),
    aggregatePartsByCar(supabase, carIds),
    aggregateExpensesByCar(supabase, carIds),
    aggregateUpdatesByCar(supabase, carIds),
  ]);
  timer.lap("aggregates", aggregateStartedAt, { authenticated: Boolean(viewerId) });
  const flagsStartedAt = performance.now();
  const flags = await viewerFlagsByCar(
    supabase,
    viewerId,
    carIds
  );
  timer.lap("viewerFlags", flagsStartedAt, { authenticated: Boolean(viewerId) });

  const cards = rows.map((rawRow) => {
    const row = normalizeCarRow(rawRow);
    const counts = partCounts.get(row.id) ?? { installed: 0, planned: 0, estimatedCost: 0 };
    const finances = expensesByCar.get(row.id) ?? { totalInvested: 0 };
    const updates = updatesByCar.get(row.id) ?? { updatesCount: 0, lastUpdateAt: null };
    return {
      ...row,
      owner: profileMap.get(row.owner_id) ?? null,
      installed_parts_count: counts.installed,
      planned_parts_count: counts.planned,
      estimated_cost: counts.estimatedCost,
      total_invested: finances.totalInvested || counts.estimatedCost,
      updates_count: updates.updatesCount,
      last_update_at: updates.lastUpdateAt,
      viewer_has_liked: flags.likes.has(row.id),
      viewer_has_saved: flags.saves.has(row.id),
      viewer_has_followed: flags.follows.has(row.id),
    };
  });
  timer.end({ authenticated: Boolean(viewerId) });
  return cards;
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
    .from("public_profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "profile_not_found" };
  return { data: { ...data, email: null, full_name: null } as ProfileRow, error: null };
}

export async function getCurrentProfile() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { userId: null, profile: null, error: "supabase_not_configured" };

  const user = await getSupabaseServerUser();
  if (!user) return { userId: null, profile: null, error: "not_authenticated" };

  const profile = await qProfileById(supabase, user.id);
  return { userId: user.id, profile: profile.data, error: profile.error };
}

export async function qCarCatalogVersions(): Promise<QueryResult<CarCatalogVersion[]>> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { data: FALLBACK_CAR_CATALOG, error: null };

  const [{ data: models, error: modelsError }, { data: versions, error: versionsError }] =
    await Promise.all([
      supabase
        .from("car_catalog_models")
        .select("*")
        .order("brand", { ascending: true })
        .order("model", { ascending: true }),
      supabase
        .from("car_catalog_versions")
        .select("*")
        .order("version", { ascending: true }),
    ]);

  if (modelsError || versionsError) {
    return { data: FALLBACK_CAR_CATALOG, error: null };
  }

  const modelMap = new Map(
    ((models ?? []) as CarCatalogModelRow[]).map((model) => [model.id, model])
  );

  const catalog = ((versions ?? []) as CarCatalogVersionRow[])
    .map((version) => {
      const model = modelMap.get(version.model_id);
      if (!model) return null;

      return {
        id: version.id,
        brand: model.brand,
        model: model.model,
        generationName: model.generation_name,
        version: version.version,
        yearStart: version.year_start,
        yearEnd: version.year_end,
        engineOriginal: version.engine_original,
        inductionOriginal: version.induction_original,
        powerHp: version.power_hp,
        drivetrain: version.drivetrain,
        transmission: version.transmission,
        fuelType: version.fuel_type,
        notes: version.notes ?? model.notes,
        isEstimated: version.is_estimated,
      } satisfies CarCatalogVersion;
    })
    .filter((version): version is CarCatalogVersion => Boolean(version));

  return { data: catalog.length ? catalog : FALLBACK_CAR_CATALOG, error: null };
}

async function qExploreCarsPublic(filters: ExploreFilters = {}): Promise<QueryResult<CarCard[]>> {
  const timer = performanceTimer("supabase", "qExploreCars", {
    hasQuery: Boolean(filters.q?.trim()),
    limit: filters.limit ?? 48,
    sort: filters.sort ?? "recent",
  });
  const supabase = getSupabasePublicClient();
  if (!supabase) {
    timer.end({ configured: false });
    return { data: [], error: null };
  }

  if (filters.q?.trim()) {
    const { data: matches, error: searchError } = await supabase.rpc("search_car_projects", {
      p_query: filters.q.trim(),
      p_category: filters.category?.trim() || null,
      p_engine: filters.engine?.trim() || null,
      p_tag: filters.tag?.trim() || null,
      p_limit: filters.limit ?? 120,
    });

    if (!searchError) {
      const rankedIds = ((matches ?? []) as Array<{ car_id: string; rank: number }>).map((match) => match.car_id);
      if (rankedIds.length) {
        let rankedQuery = supabase
          .from("cars")
          .select("*")
          .in("id", rankedIds)
          .eq("is_public", true);

        if (filters.brand?.trim()) rankedQuery = rankedQuery.ilike("brand", `%${cleanLike(filters.brand)}%`);
        if (filters.model?.trim()) rankedQuery = rankedQuery.ilike("model", `%${cleanLike(filters.model)}%`);
        if (filters.year?.trim()) {
          const year = Number.parseInt(filters.year.trim(), 10);
          if (Number.isFinite(year)) rankedQuery = rankedQuery.eq("year", year);
        }
        if (filters.fuel?.trim()) rankedQuery = rankedQuery.ilike("fuel_type", `%${cleanLike(filters.fuel)}%`);
        if (filters.induction?.trim()) rankedQuery = rankedQuery.ilike("current_induction", `%${cleanLike(filters.induction)}%`);
        if (filters.drivetrain?.trim()) rankedQuery = rankedQuery.ilike("drivetrain", `%${cleanLike(filters.drivetrain)}%`);
        if (filters.category?.trim()) rankedQuery = rankedQuery.eq("category", filters.category.trim());
        if (filters.engine?.trim()) rankedQuery = rankedQuery.ilike("engine", `%${cleanLike(filters.engine)}%`);
        if (filters.tag?.trim()) {
          const tag = filters.tag.trim().startsWith("#") ? filters.tag.trim() : `#${filters.tag.trim()}`;
          rankedQuery = rankedQuery.contains("tags", [tag.toLowerCase()]);
        }

        const { data, error } = await rankedQuery;
        if (error) return { data: null, error: error.message };

        const order = new Map(rankedIds.map((id, index) => [id, index]));
        const orderedRows = ((data ?? []) as CarRow[]).sort(
          (left, right) => (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.id) ?? Number.MAX_SAFE_INTEGER)
        );
        const cards = await hydrateCards(supabase, orderedRows);
        return { data: cards, error: null };
      }
    }

    let fallbackQuery = supabase
      .from("cars")
      .select("*")
      .eq("is_public", true)
      .limit(filters.limit ?? 120);

    if (filters.category?.trim()) fallbackQuery = fallbackQuery.eq("category", filters.category.trim());
    if (filters.brand?.trim()) fallbackQuery = fallbackQuery.ilike("brand", `%${cleanLike(filters.brand)}%`);
    if (filters.model?.trim()) fallbackQuery = fallbackQuery.ilike("model", `%${cleanLike(filters.model)}%`);
    if (filters.year?.trim()) {
      const year = Number.parseInt(filters.year.trim(), 10);
      if (Number.isFinite(year)) fallbackQuery = fallbackQuery.eq("year", year);
    }
    if (filters.fuel?.trim()) fallbackQuery = fallbackQuery.ilike("fuel_type", `%${cleanLike(filters.fuel)}%`);
    if (filters.induction?.trim()) fallbackQuery = fallbackQuery.ilike("current_induction", `%${cleanLike(filters.induction)}%`);
    if (filters.drivetrain?.trim()) fallbackQuery = fallbackQuery.ilike("drivetrain", `%${cleanLike(filters.drivetrain)}%`);
    if (filters.engine?.trim()) fallbackQuery = fallbackQuery.ilike("engine", `%${filters.engine.trim()}%`);
    if (filters.tag?.trim()) {
      const tag = filters.tag.trim().startsWith("#") ? filters.tag.trim() : `#${filters.tag.trim()}`;
      fallbackQuery = fallbackQuery.contains("tags", [tag.toLowerCase()]);
    }

    const { data: fallbackRows, error: fallbackError } = await fallbackQuery;
    if (fallbackError) return { data: null, error: fallbackError.message };

    const terms = normalizeSearchTerm(filters.q).split(" ").filter(Boolean);
    const rows = ((fallbackRows ?? []) as CarRow[])
      .filter((row) => {
        const searchText = carSearchText(row);
        return terms.every((term) => searchText.includes(term));
      })
      .sort((left, right) => carSearchRank(right, filters.q ?? "") - carSearchRank(left, filters.q ?? ""));
    const cards = await hydrateCards(supabase, rows);
    return { data: cards, error: null };
  }

  let query = supabase
    .from("cars")
    .select("*")
    .eq("is_public", true)
    .limit(filters.limit ?? 48);

  if (filters.brand?.trim()) query = query.ilike("brand", `%${cleanLike(filters.brand)}%`);
  if (filters.model?.trim()) query = query.ilike("model", `%${cleanLike(filters.model)}%`);
  if (filters.year?.trim()) {
    const year = Number.parseInt(filters.year.trim(), 10);
    if (Number.isFinite(year)) query = query.eq("year", year);
  }
  if (filters.fuel?.trim()) query = query.ilike("fuel_type", `%${cleanLike(filters.fuel)}%`);
  if (filters.induction?.trim()) query = query.ilike("current_induction", `%${cleanLike(filters.induction)}%`);
  if (filters.drivetrain?.trim()) query = query.ilike("drivetrain", `%${cleanLike(filters.drivetrain)}%`);
  if (filters.category?.trim()) query = query.eq("category", filters.category.trim());
  if (filters.state?.trim()) query = query.ilike("state", filters.state.trim());
  if (filters.engine?.trim()) query = query.ilike("engine", `%${cleanLike(filters.engine)}%`);
  if (filters.tag?.trim()) {
    const tag = filters.tag.trim().startsWith("#") ? filters.tag.trim() : `#${filters.tag.trim()}`;
    query = query.contains("tags", [tag.toLowerCase()]);
  }

  if (filters.sort === "likes") {
    query = query.order("likes_count", { ascending: false }).order("created_at", { ascending: false });
  } else if (filters.sort === "comments") {
    query = query.order("comments_count", { ascending: false }).order("created_at", { ascending: false });
  } else if (filters.sort === "saves") {
    query = query.order("saves_count", { ascending: false }).order("created_at", { ascending: false });
  } else if (filters.sort === "views") {
    query = query.order("views_count", { ascending: false }).order("created_at", { ascending: false });
  } else if (filters.sort === "updated") {
    query = query.order("updated_at", { ascending: false }).order("created_at", { ascending: false });
  } else if (filters.sort === "popular" || filters.sort === "hot" || filters.sort === "relevance") {
    query = query
      .order("project_followers_count", { ascending: false })
      .order("likes_count", { ascending: false })
      .order("comments_count", { ascending: false })
      .order("views_count", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const queryStartedAt = performance.now();
  const { data, error } = await query;
  timer.lap("cars", queryStartedAt, { rows: data?.length ?? 0 });
  if (error) {
    timer.end({ error: true });
    return { data: null, error: error.message };
  }

  const cards = await hydrateCards(supabase, (data ?? []) as CarRow[]);
  timer.end({ rows: cards.length });
  return { data: cards, error: null };
}

const qCachedExploreCarsPublic = unstable_cache(
  async (filters: ExploreFilters) => qExploreCarsPublic(filters),
  ["project-catalog-v1"],
  { revalidate: 60, tags: [PROJECT_CATALOG_CACHE_TAG] }
);

export async function qExploreCars(
  filters: ExploreFilters = {},
  options: { personalize?: boolean } = {}
): Promise<QueryResult<CarCard[]>> {
  const personalize = options.personalize !== false;
  const timer = performanceTimer("cache", "qExploreCars", {
    cached: !filters.q?.trim(),
    limit: filters.limit ?? 48,
    personalize,
    sort: filters.sort ?? "recent",
  });
  const publicResult = filters.q?.trim()
    ? await qExploreCarsPublic(filters)
    : await qCachedExploreCarsPublic(filters);

  if (publicResult.error || !publicResult.data?.length) {
    timer.end({ rows: publicResult.data?.length ?? 0, personalized: false });
    return publicResult;
  }

  if (!personalize) {
    timer.end({ rows: publicResult.data.length, personalized: false });
    return publicResult;
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    timer.end({ rows: publicResult.data.length, personalized: false });
    return publicResult;
  }

  const viewerId = await getViewerId();
  if (!viewerId) {
    timer.end({ rows: publicResult.data.length, personalized: false });
    return publicResult;
  }

  const carIds = publicResult.data.map((car) => car.id);
  const flags = await viewerFlagsByCar(supabase, viewerId, carIds);
  const data = publicResult.data.map((car) => ({
    ...car,
    viewer_has_liked: flags.likes.has(car.id),
    viewer_has_saved: flags.saves.has(car.id),
    viewer_has_followed: flags.follows.has(car.id),
  }));
  timer.end({ rows: data.length, personalized: true });
  return { data, error: null };
}

export async function qProjectSearchSuggestions(query: string, limit = 8): Promise<QueryResult<ProjectSearchSuggestion[]>> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { data: [], error: null };

  const term = query.trim();
  if (term.length < 2) return { data: [], error: null };

  const { data: rows, error } = await supabase
    .from("cars")
    .select("id, slug, name, brand, model, year, engine, category, description, tags, likes_count, comments_count, views_count, project_followers_count")
    .eq("is_public", true)
    .limit(140);

  if (error) return { data: null, error: error.message };

  const normalizedTerm = normalizeSearchTerm(term);
  const candidates: ProjectSearchSuggestion[] = [];

  for (const row of (rows ?? []) as CarRow[]) {
    if (!carSearchText(row).includes(normalizedTerm)) continue;

    candidates.push({
      term: row.name,
      source: `${row.brand} ${row.model} ${row.year}`.trim(),
      rank: Math.round(carSearchRank(row, term)) + 120,
      href: `/projeto/${row.slug}`,
    });

    const termCandidates = [
      { term: row.brand, source: "Marca", rank: 80 },
      { term: row.model, source: "Modelo", rank: 78 },
      { term: String(row.year), source: "Ano", rank: 70 },
      { term: row.engine ?? "", source: "Motor", rank: 68 },
      { term: row.category, source: "Categoria", rank: 72 },
      ...stringArray(row.tags).map((tag) => ({
        term: tag.replace(/^#+/, ""),
        source: "Tag",
        rank: 76,
      })),
    ];

    for (const item of termCandidates) {
      const itemTerm = item.term.trim();
      const normalizedItem = normalizeSearchTerm(itemTerm);
      if (!itemTerm || !normalizedItem.includes(normalizedTerm)) continue;
      candidates.push({
        ...item,
        term: itemTerm,
        rank: item.rank + (normalizedItem.startsWith(normalizedTerm) ? 35 : 0),
        href: `/explorar?q=${encodeURIComponent(itemTerm)}`,
      });
    }
  }

  const unique = new Map<string, ProjectSearchSuggestion>();
  for (const item of candidates) {
    const key = `${item.source}:${normalizeSearchTerm(item.term)}:${item.href ?? ""}`;
    const current = unique.get(key);
    if (!current || item.rank > current.rank) unique.set(key, item);
  }

  return {
    data: Array.from(unique.values())
      .sort((left, right) => right.rank - left.rank || left.term.length - right.term.length)
      .slice(0, limit),
    error: null,
  };
}

export async function qCarsByOwner(
  ownerId: string,
  includePrivate = false
): Promise<QueryResult<CarCard[]>> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { data: [], error: null };

  let query = supabase.from("cars").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false });
  if (!includePrivate) query = query.eq("is_public", true);

  const [{ data, error }, viewerId] = await Promise.all([
    query,
    getViewerId(),
  ]);
  if (error) return { data: null, error: error.message };
  const cards = await hydrateCards(supabase, (data ?? []) as CarRow[], viewerId);
  return { data: cards, error: null };
}
type ProjectRelationTable = "car_likes" | "car_saves" | "project_follows";

async function qRelatedCars(
  userId: string,
  table: ProjectRelationTable,
  preserveRelationOrder = false
): Promise<QueryResult<CarCard[]>> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { data: [], error: null };

  const { data: relations, error } = await supabase
    .from(table)
    .select("car_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return { data: null, error: error.message };

  const ids = ((relations ?? []) as Array<{ car_id: string }>).map(
    (relation) => relation.car_id
  );
  if (!ids.length) return { data: [], error: null };

  const { data: cars, error: carsError } = await supabase
    .from("cars")
    .select("*")
    .in("id", ids)
    .eq("is_public", true);
  if (carsError) return { data: null, error: carsError.message };

  const viewerId = await getViewerId();
  const cards = await hydrateCards(supabase, (cars ?? []) as CarRow[], viewerId);
  if (!preserveRelationOrder) return { data: cards, error: null };

  const order = new Map(ids.map((id, index) => [id, index]));
  return { data: cards.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0)), error: null };
}

export function qSavedCars(userId: string) {
  return qRelatedCars(userId, "car_saves", true);
}

export function qLikedCars(userId: string) {
  return qRelatedCars(userId, "car_likes");
}

export function qFollowedCars(userId: string) {
  return qRelatedCars(userId, "project_follows");
}

export async function qNotifications(limit = 20): Promise<QueryResult<NotificationWithContext[]>> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { data: [], error: null };

  const viewerId = await getViewerId();
  if (!viewerId) return { data: [], error: null };

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", viewerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (isMissingNotificationsTable(error)) {
    logNotificationQueryError("qNotifications.missing_table", error);
    return { data: [], error: null };
  }
  if (error) {
    logNotificationQueryError("qNotifications.select", error);
    return { data: null, error: error.message };
  }

  const rows = (data ?? []) as NotificationRow[];
  const actorMap = await fetchProfiles(
    supabase,
    rows.map((row) => row.actor_id ?? "")
  );
  const carIds = Array.from(new Set(rows.map((row) => row.car_id).filter((id): id is string => Boolean(id))));
  const { data: cars } = carIds.length
    ? await supabase
        .from("cars")
        .select("id, slug, name, brand, model, main_photo_url")
        .in("id", carIds)
    : { data: [] };
  const carMap = new Map(
    ((cars ?? []) as Array<Pick<CarRow, "id" | "slug" | "name" | "brand" | "model" | "main_photo_url">>).map((car) => [
      car.id,
      car,
    ])
  );

  return {
    data: rows.map((row) => ({
      ...row,
      actor: row.actor_id ? actorMap.get(row.actor_id) ?? null : null,
      car: row.car_id ? carMap.get(row.car_id) ?? null : null,
    })),
    error: null,
  };
}

export async function qUnreadNotificationCount() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { data: 0, error: null };

  const viewerId = await getViewerId();
  if (!viewerId) return { data: 0, error: null };

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", viewerId)
    .is("read_at", null);
  if (isMissingNotificationsTable(error)) {
    logNotificationQueryError("qUnreadNotificationCount.missing_table", error);
    return { data: 0, error: null };
  }
  if (error) {
    logNotificationQueryError("qUnreadNotificationCount.select", error);
    return { data: null, error: error.message };
  }
  return { data: count ?? 0, error: null };
}

export async function qViewerFollowsProfile(followingId: string): Promise<QueryResult<boolean>> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { data: false, error: null };

  const viewerId = await getViewerId();
  if (!viewerId) return { data: false, error: null };

  const { data, error } = await supabase
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", viewerId)
    .eq("following_id", followingId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: Boolean(data), error: null };
}

async function loadCarDetails(
  supabase: Client,
  slug: string,
  viewerId: string | null,
  publicOnly: boolean
): Promise<QueryResult<CarDetails>> {
  const cardResult = await loadCarCardBySlug(supabase, slug, viewerId, publicOnly);
  if (!cardResult.data) return cardResult;
  return hydrateCarDetails(supabase, cardResult.data);
}

const qCachedPublicProfileByUsername = unstable_cache(
  async (username: string): Promise<QueryResult<ProfileRow>> => {
    const supabase = getSupabasePublicClient();
    if (!supabase) return { data: null, error: "supabase_not_configured" };
    return qProfileByUsername(supabase, username);
  },
  ["public-profile-by-username-v1"],
  { revalidate: 60, tags: [PUBLIC_PROFILE_CACHE_TAG] }
);

export function qPublicProfileByUsername(username: string) {
  return qCachedPublicProfileByUsername(username);
}

async function hydrateCarDetails(
  supabase: Client,
  card: CarCard
): Promise<QueryResult<CarDetails>> {
  const carId = card.id;
  const [photosResult, partsResult, commentsResult, updatesResult, expensesResult] = await Promise.all([
    supabase.from("car_photos").select("*").eq("car_id", carId).order("sort_order", { ascending: true }),
    supabase.from("car_parts").select("*").eq("car_id", carId).order("status", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("car_comments").select("*").eq("car_id", carId).order("created_at", { ascending: false }).limit(50),
    supabase
      .from("car_build_updates")
      .select("*")
      .eq("car_id", carId)
      .order("happened_at", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("car_expenses")
      .select("*")
      .eq("car_id", carId)
      .order("spent_at", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  const { data: photos } = photosResult;
  const { data: parts } = partsResult;
  const { data: comments } = commentsResult;
  const { data: updates } = updatesResult;
  const { data: expenses } = expensesResult;
  const partRows = (parts ?? []) as CarPartRow[];
  const expenseRows = (expenses ?? []) as CarExpenseRow[];
  const updateRows = ((updates ?? []) as CarBuildUpdateRow[]).map(normalizeUpdateRow);
  const installedParts = partRows.filter((part) => part.status === "installed").length;
  const plannedParts = partRows.filter((part) => part.status === "planned").length;
  const estimatedCost = partRows.reduce(
    (sum, part) => sum + Math.max(0, part.price_estimate ?? 0),
    0
  );
  const totalInvested = expenseRows.reduce(
    (sum, expense) => sum + Math.max(0, expense.amount),
    0
  );
  const hydratedCard: CarCard = {
    ...card,
    installed_parts_count: installedParts,
    planned_parts_count: plannedParts,
    estimated_cost: estimatedCost,
    total_invested: totalInvested || estimatedCost,
    updates_count: updateRows.length,
    last_update_at: updateRows[0]?.happened_at ?? null,
  };

  const commentRows = (comments ?? []) as CarCommentRow[];
  const commentAuthorMap = await fetchProfiles(
    supabase,
    commentRows.map((comment) => comment.user_id)
  );

  return {
    data: {
      ...hydratedCard,
      photos: (photos ?? []) as CarPhotoRow[],
      parts: (parts ?? []) as CarPartRow[],
      comments: commentRows.map((comment) => ({
        ...comment,
        author: commentAuthorMap.get(comment.user_id) ?? null,
      })),
      updates: updateRows,
      expenses: expenseRows,
    },
    error: null,
  };
}

async function loadCarCardBySlug(
  supabase: Client,
  slug: string,
  viewerId: string | null,
  publicOnly: boolean
): Promise<QueryResult<CarCard>> {
  let carQuery = supabase.from("cars").select("*").eq("slug", slug);
  if (publicOnly) carQuery = carQuery.eq("is_public", true);

  const { data: row, error } = await carQuery.maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!row) return { data: null, error: "car_not_found" };

  const normalizedRow = normalizeCarRow(row as CarRow);
  const [ownerMap, flags] = await Promise.all([
    fetchProfiles(supabase, [normalizedRow.owner_id]),
    viewerFlagsByCar(supabase, viewerId, [normalizedRow.id]),
  ]);

  return {
    data: {
      ...normalizedRow,
      owner: ownerMap.get(normalizedRow.owner_id) ?? null,
      installed_parts_count: 0,
      planned_parts_count: 0,
      estimated_cost: 0,
      total_invested: 0,
      updates_count: 0,
      last_update_at: normalizedRow.updated_at,
      viewer_has_liked: flags.likes.has(normalizedRow.id),
      viewer_has_saved: flags.saves.has(normalizedRow.id),
      viewer_has_followed: flags.follows.has(normalizedRow.id),
    },
    error: null,
  };
}

const qCachedPublicCarCardBySlug = unstable_cache(
  async (slug: string) => {
    const supabase = getSupabasePublicClient();
    if (!supabase) return { data: null, error: "supabase_not_configured" } as QueryResult<CarCard>;
    return loadCarCardBySlug(supabase, slug, null, true);
  },
  ["public-project-critical-v1"],
  { revalidate: 60, tags: [PROJECT_CATALOG_CACHE_TAG] }
);

export function qPublicCarCardBySlug(slug: string): Promise<QueryResult<CarCard>> {
  return qCachedPublicCarCardBySlug(slug);
}

const qCachedPublicCarDetailsFromCard = unstable_cache(
  async (card: CarCard) => {
    const supabase = getSupabasePublicClient();
    if (!supabase) return { data: null, error: "supabase_not_configured" } as QueryResult<CarDetails>;
    return hydrateCarDetails(supabase, card);
  },
  ["public-project-secondary-v1"],
  { revalidate: 60, tags: [PROJECT_CATALOG_CACHE_TAG] }
);

export async function qCarCardBySlug(slug: string): Promise<QueryResult<CarCard>> {
  const timer = performanceTimer("supabase", "qCarCardBySlug", { slug });
  const viewerId = await getViewerId();

  if (viewerId) {
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      timer.end({ configured: false });
      return { data: null, error: "supabase_not_configured" };
    }

    const result = await loadCarCardBySlug(supabase, slug, viewerId, false);
    timer.end({ cachedPublic: false, personalized: true, found: Boolean(result.data) });
    return result;
  }

  const result = await qCachedPublicCarCardBySlug(slug);
  timer.end({ cachedPublic: true, personalized: false, found: Boolean(result.data) });
  return result;
}

export async function qCarDetailsFromCard(card: CarCard): Promise<QueryResult<CarDetails>> {
  const timer = performanceTimer("supabase", "qCarDetailsFromCard", { slug: card.slug });
  const viewerId = await getViewerId();
  if (!viewerId) {
    const result = await qCachedPublicCarDetailsFromCard(card);
    timer.end({ cachedPublic: true, personalized: false, found: Boolean(result.data) });
    return result;
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    timer.end({ configured: false });
    return { data: null, error: "supabase_not_configured" };
  }

  const result = await hydrateCarDetails(supabase, card);
  timer.end({ cachedPublic: false, personalized: true, found: Boolean(result.data) });
  return result;
}

const qCachedPublicCarBySlug = unstable_cache(
  async (slug: string) => {
    const supabase = getSupabasePublicClient();
    if (!supabase) return { data: null, error: "supabase_not_configured" } as QueryResult<CarDetails>;
    return loadCarDetails(supabase, slug, null, true);
  },
  ["public-project-detail-v1"],
  { revalidate: 60, tags: [PROJECT_CATALOG_CACHE_TAG] }
);

export async function qCarBySlug(slug: string): Promise<QueryResult<CarDetails>> {
  const timer = performanceTimer("supabase", "qCarBySlug", { slug });
  const viewerId = await getViewerId();
  if (viewerId) {
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      timer.end({ configured: false });
      return { data: null, error: "supabase_not_configured" };
    }

    // Leituras autenticadas permanecem fora do cache público: RLS pode liberar
    // despesas ou projetos privados apenas para o proprietário.
    const personalizedResult = await loadCarDetails(supabase, slug, viewerId, false);
    timer.end({
      cachedPublic: false,
      personalized: true,
      found: Boolean(personalizedResult.data),
      comments: personalizedResult.data?.comments.length ?? 0,
    });
    return personalizedResult;
  }

  const publicResult = await qCachedPublicCarBySlug(slug);
  timer.end({
    cachedPublic: true,
    personalized: false,
    found: Boolean(publicResult.data),
    comments: publicResult.data?.comments.length ?? 0,
  });
  return publicResult;
}
