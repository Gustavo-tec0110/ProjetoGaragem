import Image from "next/image";
import Link from "next/link";

import { CommunityFeed, type CommunityBuild } from "@/components/community/community-feed";
import { WeeklyRankingGrid } from "@/components/community/weekly-ranking-grid";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PremiumCard } from "@/components/ui/premium-card";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { qCarsLite } from "@/lib/supabase/queries";

export const metadata = {
  title: "Comunidade",
};

type RankingItem = {
  category: string;
  buildSlug: string;
  buildName: string;
  car: string;
  likes: number;
  creatorHandle: string;
};

export default async function ComunidadePage() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteNavbar />
        <main className="flex-1 px-4 sm:px-6">
          <div className="mx-auto w-full max-w-6xl pt-20 md:pt-24 pb-12">
            <Card className="p-6 md:p-8">
              <p className="text-xs text-muted">Comunidade</p>
              <h1 className="mt-2 font-title text-2xl tracking-tight">
                Configure o Supabase para ativar o feed
              </h1>
              <p className="mt-2 text-sm text-muted">
                Configure <span className="text-foreground font-semibold">.env.local</span> com{" "}
                <span className="text-foreground font-semibold">NEXT_PUBLIC_SUPABASE_URL</span> e{" "}
                <span className="text-foreground font-semibold">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>.
              </p>
            </Card>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const carsRes = await qCarsLite(supabase);
  const cars = (carsRes.data ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    brand: c.brand,
  }));

  const carMap = new Map<string, { slug: string; name: string; brand: string }>();
  for (const c of cars) carMap.set(c.id, { slug: c.slug, name: c.name, brand: c.brand });

  const { data: builds } = await supabase
    .from("builds")
    .select(
      "id, slug, title, user_id, car_id, style, budget_min, budget_max, compatibility_score, likes_count, car_photo_url, created_at"
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(12);

  const buildRows = (builds ?? []) as Array<{
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

  const userIds = Array.from(new Set(buildRows.map((b) => b.user_id)));
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, builds_count")
        .in("id", userIds)
    : { data: [] as unknown[] };

  const profileMap = new Map<
    string,
    { id: string; username: string; display_name: string; avatar_url: string | null; builds_count: number }
  >();

  for (const row of (profiles ?? []) as Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    builds_count: number;
  }>) {
    profileMap.set(row.id, row);
  }

  const initialBuilds: CommunityBuild[] = buildRows
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

  const rankingItems: RankingItem[] = [];
  const { data: ranking, error: rankingError } = await supabase.rpc("weekly_build_ranking", { limit_count: 6 });
  if (!rankingError) {
    const rows = (ranking ?? []) as Array<{ build_id: string; likes_week: number }>;
    const ids = rows.map((r) => r.build_id);

    if (ids.length) {
      const { data: rankedBuilds } = await supabase
        .from("builds")
        .select("id, slug, title, user_id, car_id, style")
        .in("id", ids);

      const ranked = (rankedBuilds ?? []) as Array<{
        id: string;
        slug: string;
        title: string;
        user_id: string;
        car_id: string;
        style: string;
      }>;

      const rankedUserIds = Array.from(new Set(ranked.map((b) => b.user_id)));
      const { data: rankedProfiles } = rankedUserIds.length
        ? await supabase.from("profiles").select("id, username").in("id", rankedUserIds)
        : { data: [] as unknown[] };

      const rankedProfileMap = new Map<string, string>();
      for (const row of (rankedProfiles ?? []) as Array<{ id: string; username: string }>) {
        rankedProfileMap.set(row.id, row.username);
      }

      const likesWeekById = new Map<string, number>();
      for (const r of rows) likesWeekById.set(r.build_id, r.likes_week);

      for (const b of ranked) {
        const car = carMap.get(b.car_id);
        rankingItems.push({
          category: b.style,
          buildSlug: b.slug,
          buildName: b.title,
          car: car?.name ?? "Carro",
          likes: likesWeekById.get(b.id) ?? 0,
          creatorHandle: rankedProfileMap.get(b.user_id) ?? "membro",
        });
      }

      rankingItems.sort((a, b) => b.likes - a.likes);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl pt-20 md:pt-24 pb-12">
          <PremiumCard className="relative overflow-hidden">
            <div className="absolute inset-0">
              <Image
                src="/ref/hero-car.jpg"
                alt=""
                fill
                priority
                className="object-cover object-right opacity-45 blur-[2px] scale-[1.06]"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/70 to-black/35" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/40 to-black/30" />
              <div className="absolute inset-0 pointer-events-none pg-scanlines opacity-16" />
              <div className="absolute inset-0 pointer-events-none pg-particles opacity-40" />
            </div>

            <div className="relative p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div>
                  <p className="text-xs text-muted">Comunidade</p>
                  <h1 className="mt-2 font-title text-3xl md:text-4xl tracking-tight">
                    Feed real de builds (Supabase)
                  </h1>
                  <p className="mt-2 text-muted max-w-2xl">
                    Builds públicas, curtidas e ranking semanal baseado em likes dos últimos 7 dias.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button asChild>
                    <Link href="/montar">Postar build</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/montar">Montar</Link>
                  </Button>
                </div>
              </div>
            </div>
          </PremiumCard>

          <section className="mt-10">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-xs text-muted">Ranking semanal</p>
                <h2 className="mt-2 font-title text-2xl md:text-3xl tracking-tight">
                  Top builds da semana
                </h2>
                <p className="mt-2 text-muted max-w-2xl">
                  Calculado por curtidas na tabela <span className="text-foreground font-semibold">likes</span>.
                </p>
              </div>
            </div>

            <div className="mt-6">
              {rankingItems.length ? (
                <WeeklyRankingGrid items={rankingItems} />
              ) : (
                <div className="rounded-4xl border border-border/70 bg-background/25 p-5 text-sm text-muted">
                  Ainda não há curtidas suficientes nesta semana.
                </div>
              )}
            </div>
          </section>

          <section className="mt-12">
            <CommunityFeed initialBuilds={initialBuilds} cars={cars} />
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

