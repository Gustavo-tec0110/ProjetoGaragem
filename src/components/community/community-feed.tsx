"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Loader2, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PremiumCard } from "@/components/ui/premium-card";
import { formatBRLCompact } from "@/lib/pricing";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useSupabaseUser } from "@/lib/supabase/use-user";
import { cn } from "@/lib/utils";

type CarOption = {
  id: string;
  slug: string;
  name: string;
  brand: string;
};

export type CommunityBuild = {
  id: string;
  slug: string;
  title: string;
  style: string;
  compatibility_score: number;
  budget_min: number | null;
  budget_max: number | null;
  likes_count: number;
  car_photo_url: string | null;
  created_at: string;
  car: { slug: string; name: string };
  author: { id: string; username: string; display_name: string; avatar_url: string | null; builds_count: number };
};

type SortMode = "recentes" | "curtidas";

function normalizeKey(value: string) {
  try {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

function carFallbackImage(carSlug: string) {
  const key = normalizeKey(carSlug);
  if (key.includes("golf") || key.includes("wrx")) return "/ref/car-white.jpg";
  if (key.includes("gol") || key.includes("onix")) return "/ref/car-black.jpg";
  return "/ref/hero-car.jpg";
}

function reputationLabel(buildsCount: number) {
  if (buildsCount >= 25) return "Lenda";
  if (buildsCount >= 10) return "Expert";
  if (buildsCount >= 3) return "Builder";
  return "Iniciante";
}

export function CommunityFeed({
  initialBuilds,
  cars,
}: {
  initialBuilds: CommunityBuild[];
  cars: CarOption[];
}) {
  const { user, loading: userLoading } = useSupabaseUser();
  const supabase = getSupabaseBrowserClient();

  const [items, setItems] = React.useState<CommunityBuild[]>(() => initialBuilds);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(true);

  const [query, setQuery] = React.useState("");
  const [styleFilter, setStyleFilter] = React.useState<string | null>(null);
  const [carIdFilter, setCarIdFilter] = React.useState<string | null>(null);
  const [budgetMax, setBudgetMax] = React.useState<number | null>(null);
  const [sort, setSort] = React.useState<SortMode>("recentes");
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const [liked, setLiked] = React.useState<Record<string, boolean>>({});

  const cursor = React.useMemo(() => {
    if (!items.length) return null;
    const last = items[items.length - 1];
    return { created_at: last.created_at, likes_count: last.likes_count };
  }, [items]);

  const availableStyles = React.useMemo(() => {
    const set = new Set<string>();
    for (const b of initialBuilds) set.add(b.style);
    for (const b of items) set.add(b.style);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [initialBuilds, items]);

  const filteredItems = React.useMemo(() => {
    const q = normalizeKey(query);
    return items.filter((b) => {
      if (styleFilter && b.style !== styleFilter) return false;
      if (carIdFilter && b.car && cars.find((c) => c.id === carIdFilter)?.slug !== b.car.slug) return false;
      if (budgetMax != null && b.budget_max != null && b.budget_max > budgetMax) return false;
      if (!q) return true;
      const hay = normalizeKey(`${b.title} ${b.style} ${b.car.name} ${b.author.username} ${b.author.display_name}`);
      return hay.includes(q);
    });
  }, [budgetMax, carIdFilter, cars, items, query, styleFilter]);

  async function refreshLikes(builds: CommunityBuild[]) {
    if (!supabase) return;
    if (!user || userLoading) {
      setLiked({});
      return;
    }
    if (!builds.length) return;

    const ids = builds.map((b) => b.id);
    const { data, error } = await supabase
      .from("likes")
      .select("build_id")
      .eq("user_id", user.id)
      .in("build_id", ids);

    if (error) return;
    const next: Record<string, boolean> = {};
    for (const row of data ?? []) {
      const buildId = (row as { build_id: string }).build_id;
      next[buildId] = true;
    }
    setLiked(next);
  }

  React.useEffect(() => {
    void refreshLikes(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function fetchPage({ reset }: { reset: boolean }) {
    if (!supabase) return;
    setError(null);

    const pageSize = 12;
    let q = supabase
      .from("builds")
      .select("id, slug, title, user_id, car_id, style, budget_min, budget_max, compatibility_score, likes_count, car_photo_url, created_at")
      .eq("is_public", true);

    if (styleFilter) q = q.eq("style", styleFilter);
    if (carIdFilter) q = q.eq("car_id", carIdFilter);
    if (budgetMax != null) q = q.lte("budget_max", budgetMax);

    if (!reset && cursor) {
      if (sort === "recentes") {
        q = q.lt("created_at", cursor.created_at);
      } else {
        q = q.lt("likes_count", cursor.likes_count);
      }
    }

    if (sort === "recentes") {
      q = q.order("created_at", { ascending: false });
    } else {
      q = q.order("likes_count", { ascending: false }).order("created_at", { ascending: false });
    }

    q = q.limit(pageSize);

    const { data, error } = await q;
    if (error) {
      setError(error.message);
      return;
    }

    const builds = (data ?? []) as Array<{
      id: string;
      slug: string;
      title: string;
      user_id: string;
      car_id: string;
      style: string;
      budget_min: number | null;
      budget_max: number | null;
      compatibility_score: number;
      likes_count: number;
      car_photo_url: string | null;
      created_at: string;
    }>;

    const carIds = Array.from(new Set(builds.map((b) => b.car_id)));
    const userIds = Array.from(new Set(builds.map((b) => b.user_id)));

    const [carsRes, profilesRes] = await Promise.all([
      carIds.length
        ? supabase.from("cars").select("id, slug, name, brand").in("id", carIds)
        : Promise.resolve({ data: [] as unknown[] }),
      userIds.length
        ? supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url, builds_count")
            .in("id", userIds)
        : Promise.resolve({ data: [] as unknown[] }),
    ]);

    const carMap = new Map<string, { id: string; slug: string; name: string; brand: string }>();
    for (const row of (carsRes.data ?? []) as Array<{ id: string; slug: string; name: string; brand: string }>) {
      carMap.set(row.id, row);
    }

    const profileMap = new Map<string, { id: string; username: string; display_name: string; avatar_url: string | null; builds_count: number }>();
    for (const row of (profilesRes.data ?? []) as Array<{ id: string; username: string; display_name: string; avatar_url: string | null; builds_count: number }>) {
      profileMap.set(row.id, row);
    }

    const resolved: CommunityBuild[] = builds
      .map((b) => {
        const car = carMap.get(b.car_id);
        const author = profileMap.get(b.user_id);
        if (!car || !author) return null;
        return {
          id: b.id,
          slug: b.slug,
          title: b.title,
          style: b.style,
          compatibility_score: b.compatibility_score,
          budget_min: b.budget_min,
          budget_max: b.budget_max,
          likes_count: b.likes_count,
          car_photo_url: b.car_photo_url,
          created_at: b.created_at,
          car: { slug: car.slug, name: car.name },
          author: {
            id: author.id,
            username: author.username,
            display_name: author.display_name,
            avatar_url: author.avatar_url,
            builds_count: author.builds_count,
          },
        };
      })
      .filter(Boolean) as CommunityBuild[];

    setItems((prev) => (reset ? resolved : [...prev, ...resolved]));
    setHasMore(resolved.length === pageSize);
    await refreshLikes(reset ? resolved : [...items, ...resolved]);
  }

  async function loadMore() {
    if (!supabase) return;
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await fetchPage({ reset: false });
    } finally {
      setLoadingMore(false);
    }
  }

  React.useEffect(() => {
    if (!supabase) return;
    setHasMore(true);
    setLoadingMore(true);
    void fetchPage({ reset: true }).finally(() => setLoadingMore(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleFilter, carIdFilter, budgetMax, sort]);

  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        void loadMore();
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentinelRef.current, cursor?.created_at, hasMore, loadingMore]);

  async function toggleLike(buildId: string) {
    if (!supabase) return;
    setError(null);
    if (userLoading) return;
    if (!user) {
      setError("Faça login para curtir builds.");
      return;
    }

    const currentlyLiked = Boolean(liked[buildId]);
    setLiked((prev) => ({ ...prev, [buildId]: !currentlyLiked }));
    setItems((prev) =>
      prev.map((b) =>
        b.id === buildId
          ? { ...b, likes_count: Math.max(0, b.likes_count + (currentlyLiked ? -1 : 1)) }
          : b
      )
    );

    if (currentlyLiked) {
      const { error } = await supabase.from("likes").delete().eq("user_id", user.id).eq("build_id", buildId);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from("likes").insert({ user_id: user.id, build_id: buildId });
      if (error) setError(error.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted">Feed</p>
          <h2 className="mt-2 font-title text-2xl md:text-3xl tracking-tight">
            Builds públicas
          </h2>
          <p className="mt-2 text-muted max-w-2xl">
            Sem demo: cards e contagem vêm do banco.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no feed…"
            className="sm:w-72"
          />
          <Button type="button" variant="outline" onClick={() => setFiltersOpen((v) => !v)}>
            <SlidersHorizontal className="size-4" />
            Filtros
          </Button>
        </div>
      </div>

      {filtersOpen ? (
        <PremiumCard className="p-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs text-muted">Ordenar</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={sort === "recentes" ? "default" : "outline"}
                  onClick={() => setSort("recentes")}
                >
                  Mais recentes
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={sort === "curtidas" ? "default" : "outline"}
                  onClick={() => setSort("curtidas")}
                >
                  Mais curtidas
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted">
                Paginação por cursor é mais precisa em "Mais recentes".
              </p>
            </div>

            <div>
              <p className="text-xs text-muted">Estilo</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={styleFilter ? "outline" : "default"}
                  onClick={() => setStyleFilter(null)}
                >
                  Todos
                </Button>
                {availableStyles.slice(0, 10).map((s) => (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant={styleFilter === s ? "default" : "outline"}
                    onClick={() => setStyleFilter(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted">Carro</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={carIdFilter ? "outline" : "default"}
                  onClick={() => setCarIdFilter(null)}
                >
                  Todos
                </Button>
                {cars.slice(0, 8).map((c) => (
                  <Button
                    key={c.id}
                    type="button"
                    size="sm"
                    variant={carIdFilter === c.id ? "default" : "outline"}
                    onClick={() => setCarIdFilter(c.id)}
                  >
                    {c.brand} {c.name}
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">
                Dica: use busca para achar builds do seu modelo.
              </p>
            </div>

            <div>
              <p className="text-xs text-muted">Orçamento máximo</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={budgetMax == null ? "default" : "outline"}
                  onClick={() => setBudgetMax(null)}
                >
                  Livre
                </Button>
                {[10000, 20000, 40000, 80000, 100000].map((v) => (
                  <Button
                    key={v}
                    type="button"
                    size="sm"
                    variant={budgetMax === v ? "default" : "outline"}
                    onClick={() => setBudgetMax(v)}
                  >
                    {v >= 100000 ? "R$ 100k+" : formatBRLCompact(v)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </PremiumCard>
      ) : null}

      {error ? (
        <div className="rounded-4xl border border-danger/30 bg-danger/10 p-4 text-sm text-muted">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((build) => {
          const img = build.car_photo_url || carFallbackImage(build.car.slug);
          const likedNow = Boolean(liked[build.id]);
          const budgetLabel =
            build.budget_min != null && build.budget_max != null
              ? `${formatBRLCompact(build.budget_min)}–${formatBRLCompact(build.budget_max)}`
              : build.budget_max != null
                ? `Até ${formatBRLCompact(build.budget_max)}`
                : "—";

          return (
            <PremiumCard key={build.id} className="group relative overflow-hidden">
              <div className="absolute inset-0">
                <Image
                  src={img}
                  alt=""
                  fill
                  className="object-cover opacity-35 blur-[2px] scale-[1.06] transition-opacity duration-300 group-hover:opacity-45"
                  sizes="(max-width: 768px) 90vw, 340px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/20" />
                <div className="absolute inset-0 pointer-events-none pg-scanlines opacity-18" />
                <div className="absolute inset-0 pointer-events-none pg-particles opacity-45" />
              </div>

              <div className="relative p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted">{build.style}</p>
                    <Link
                      href={`/builds/${build.slug}`}
                      className="block mt-1 font-title text-lg tracking-tight hover:brightness-110 transition truncate"
                    >
                      {build.title}
                    </Link>
                    <p className="mt-2 text-sm text-muted">{build.car.name}</p>
                  </div>
                  <Badge variant="secondary">
                    {build.compatibility_score}% compat.
                  </Badge>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted">Orçamento</span>
                  <span className="text-foreground font-semibold">{budgetLabel}</span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <Link
                    href={`/perfil/${build.author.username}`}
                    className="min-w-0 text-xs font-ui font-semibold text-muted hover:text-foreground transition truncate"
                  >
                    @{build.author.username}{" "}
                    <span className="text-[10px] text-muted font-normal">
                      • {reputationLabel(build.author.builds_count)}
                    </span>
                  </Link>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void toggleLike(build.id)}
                    className={cn(
                      "h-10 px-3 rounded-3xl border border-border/70 bg-background/20 hover:bg-background/40",
                      likedNow && "border-accent/35 bg-accent/10 shadow-glow"
                    )}
                    aria-pressed={likedNow}
                  >
                    <Heart
                      fill={likedNow ? "currentColor" : "none"}
                      className={cn("size-4", likedNow ? "text-accent" : "text-muted")}
                    />
                    <span className="text-xs font-semibold tabular-nums">
                      {build.likes_count.toLocaleString("pt-BR")}
                    </span>
                  </Button>
                </div>
              </div>
            </PremiumCard>
          );
        })}
      </div>

      <div ref={sentinelRef} className="h-10" />

      <div className="flex items-center justify-center">
        {loadingMore ? (
          <div className="inline-flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" /> Carregando…
          </div>
        ) : !hasMore ? (
          <p className="text-sm text-muted">Fim do feed.</p>
        ) : null}
      </div>
    </div>
  );
}

