import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gauge, Layers3, Wrench } from "lucide-react";

import { BuildShareModal } from "@/components/build/build-share-modal";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PremiumCard } from "@/components/ui/premium-card";
import { formatBRLCompact, formatBRLRange } from "@/lib/pricing";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { parseBuildPartIds } from "@/lib/supabase/queries";

type CarRow = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  model: string;
};

type PartRow = {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  subcategory: string | null;
  price_min: number | null;
  price_max: number | null;
  affiliate_url: string | null;
  affiliate_store: string | null;
};

type BuildRow = {
  id: string;
  slug: string;
  title: string;
  user_id: string;
  car_id: string;
  style: string;
  budget_min: number | null;
  budget_max: number | null;
  compatibility_score: number;
  parts: unknown;
  description: string | null;
  car_photo_url: string | null;
  is_public: boolean;
  likes_count: number;
  shares_count: number;
  views_count: number;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

function carFallbackImage(carSlug: string) {
  const key = carSlug.toLowerCase();
  if (key.includes("golf") || key.includes("wrx")) return "/ref/car-white.jpg";
  if (key.includes("gol") || key.includes("onix")) return "/ref/car-black.jpg";
  return "/ref/hero-car.jpg";
}

function totalPartsBudget(parts: PartRow[]) {
  return parts.reduce(
    (acc, p) => ({
      min: acc.min + (p.price_min ?? 0),
      max: acc.max + (p.price_max ?? p.price_min ?? 0),
    }),
    { min: 0, max: 0 }
  );
}

async function getBuildBundle(slug: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data: build, error: buildError } = await supabase
    .from("builds")
    .select(
      "id, slug, title, user_id, car_id, style, budget_min, budget_max, compatibility_score, parts, description, car_photo_url, is_public, likes_count, shares_count, views_count, created_at"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (buildError || !build) return null;

  const typedBuild = build as BuildRow;

  const { data: car } = await supabase
    .from("cars")
    .select("id, slug, name, brand, model")
    .eq("id", typedBuild.car_id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", typedBuild.user_id)
    .maybeSingle();

  const partIds = parseBuildPartIds(typedBuild.parts);
  const { data: parts } = partIds.length
    ? await supabase
        .from("parts")
        .select(
          "id, name, brand, category, subcategory, price_min, price_max, affiliate_url, affiliate_store"
        )
        .in("id", partIds)
    : { data: [] as PartRow[] };

  return {
    build: typedBuild,
    car: (car ?? null) as CarRow | null,
    profile: (profile ?? null) as ProfileRow | null,
    parts: (parts ?? []) as PartRow[],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await getBuildBundle(slug);
  if (!bundle) return { title: "Build não encontrada — ProjetoGaragem" };

  const { build, car, parts, profile } = bundle;
  const carName = car?.name ?? "Carro";
  const author = profile?.username ? `@${profile.username}` : "membro";

  const budgetText =
    build.budget_min != null && build.budget_max != null
      ? `${formatBRLCompact(build.budget_min)}–${formatBRLCompact(build.budget_max)}`
      : build.budget_max != null
        ? `até ${formatBRLCompact(build.budget_max)}`
        : "orçamento livre";

  const description = `Build ${build.style} para ${carName} por ${author}. Orçamento ${budgetText}. ${parts.length} peça(s). Score de compatibilidade: ${build.compatibility_score}%.`;

  return {
    title: `${build.title} — ${carName} | ProjetoGaragem`,
    description,
    robots: build.is_public ? undefined : { index: false, follow: false },
    openGraph: {
      title: build.title,
      description,
      images: [{ url: `/api/og/${build.slug}` }],
    },
    keywords: [
      carName,
      `tuning ${carName}`,
      `build ${build.style}`,
      `modificações ${carName}`,
      "projeto automotivo brasil",
    ],
  };
}

export default async function BuildPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bundle = await getBuildBundle(slug);
  if (!bundle) notFound();

  const { build, car, parts, profile } = bundle;
  const authorHandle = profile?.username ? `@${profile.username}` : "@membro";

  const heroImage = build.car_photo_url || (car ? carFallbackImage(car.slug) : "/ref/hero-car.jpg");

  const total = totalPartsBudget(parts);
  const totalRange = {
    min: Math.round(total.min),
    max: Math.round(total.max),
    mid: Math.round((total.min + total.max) / 2),
  };

  const partsByCategory = parts.reduce<Record<string, PartRow[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  const categories = Object.keys(partsByCategory).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl pt-20 md:pt-24 pb-12">
          <div className="flex items-center justify-between gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/comunidade">Voltar ao feed</Link>
            </Button>
            {build.is_public ? <Badge variant="success">Pública</Badge> : <Badge variant="secondary">Privada</Badge>}
          </div>

          <PremiumCard className="mt-4 relative overflow-hidden">
            <div className="absolute inset-0">
              <Image
                src={heroImage}
                alt=""
                fill
                priority
                className="object-cover opacity-45 blur-[2px] scale-[1.06]"
                sizes="(max-width: 1024px) 96vw, 1000px"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/70 to-black/35" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/40 to-black/30" />
              <div className="absolute inset-0 pointer-events-none pg-scanlines opacity-16" />
              <div className="absolute inset-0 pointer-events-none pg-particles opacity-40" />
            </div>

            <div className="relative p-6 md:p-8">
              <p className="text-xs text-muted">Build</p>
              <h1 className="mt-2 font-title text-3xl md:text-4xl tracking-tight">
                {build.title}
              </h1>
              <p className="mt-2 text-muted max-w-2xl">
                {car?.name ?? "Carro"} • {build.style} •{" "}
                <span className="text-foreground font-semibold">{authorHandle}</span>
              </p>
              {build.description ? (
                <p className="mt-4 text-sm text-muted max-w-2xl">{build.description}</p>
              ) : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                  <p className="text-xs text-muted">Compatibilidade</p>
                  <p className="mt-2 font-title tracking-tight tabular-nums">
                    {build.compatibility_score}%
                  </p>
                  <p className="mt-1 text-xs text-muted">{parts.length} peça(s)</p>
                </div>
                <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                  <p className="text-xs text-muted">Orçamento (definido)</p>
                  <p className="mt-2 font-title tracking-tight tabular-nums">
                    {build.budget_min != null && build.budget_max != null
                      ? `${formatBRLCompact(build.budget_min)}–${formatBRLCompact(build.budget_max)}`
                      : build.budget_max != null
                        ? `Até ${formatBRLCompact(build.budget_max)}`
                        : "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted">Faixa escolhida no planejador</p>
                </div>
                <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                  <p className="text-xs text-muted">Orçamento (peças)</p>
                  <p className="mt-2 font-title tracking-tight tabular-nums">
                    {formatBRLCompact(totalRange.mid)}
                  </p>
                  <p className="mt-1 text-xs text-muted">{formatBRLRange(totalRange)}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-2">
                <BuildShareModal buildSlug={build.slug} title={build.title} />
                <Button asChild variant="outline">
                  <Link href="/montar">Montar outra</Link>
                </Button>
              </div>
            </div>
          </PremiumCard>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="min-w-0 space-y-6">
              <PremiumCard className="p-6">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted">Peças</p>
                    <h2 className="mt-1 font-title text-xl tracking-tight">
                      Lista da build
                    </h2>
                    <p className="mt-2 text-sm text-muted">
                      Organizada por categoria, com links de afiliado quando existirem.
                    </p>
                  </div>
                  <Badge variant="secondary">{parts.length}</Badge>
                </div>

                {parts.length ? (
                  <div className="mt-5 space-y-6">
                    {categories.map((cat) => (
                      <section key={cat} className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-title tracking-tight">{cat}</h3>
                          <Badge variant="secondary">{partsByCategory[cat]?.length ?? 0}</Badge>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          {(partsByCategory[cat] ?? [])
                            .slice()
                            .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
                            .map((p) => (
                              <div
                                key={p.id}
                                className="rounded-4xl border border-border/70 bg-background/25 p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-xs text-muted">{p.brand ?? "Marca"}</p>
                                    <p className="mt-1 font-ui font-semibold tracking-tight truncate">
                                      {p.name}
                                    </p>
                                    <p className="mt-1 text-xs text-muted truncate">
                                      {p.subcategory ?? p.category} •{" "}
                                      {p.price_min == null && p.price_max == null
                                        ? "Preço a definir"
                                        : `${formatBRLCompact(p.price_min ?? p.price_max ?? 0)}–${formatBRLCompact(p.price_max ?? p.price_min ?? 0)}`}
                                    </p>
                                  </div>
                                  {p.affiliate_url ? (
                                    <Badge variant="success">Comprar</Badge>
                                  ) : (
                                    <Badge variant="secondary">Em breve</Badge>
                                  )}
                                </div>

                                <div className="mt-4">
                                  {p.affiliate_url ? (
                                    <Button asChild size="sm" variant="outline" className="w-full">
                                      <a href={p.affiliate_url} target="_blank" rel="noreferrer">
                                        Ver peça
                                      </a>
                                    </Button>
                                  ) : (
                                    <Button size="sm" variant="outline" className="w-full" disabled>
                                      Em breve
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-4xl border border-border/70 bg-background/25 p-5 text-sm text-muted">
                    Esta build ainda não tem peças.
                  </div>
                )}
              </PremiumCard>
            </div>

            <div className="space-y-4 lg:sticky lg:top-24">
              <PremiumCard className="p-6">
                <p className="text-xs text-muted">Destaques</p>
                <h2 className="mt-2 font-title text-xl tracking-tight">
                  Pronta para compartilhar
                </h2>
                <p className="mt-2 text-sm text-muted">
                  O card social é gerado automaticamente. Ideal para WhatsApp e X.
                </p>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                    <p className="text-xs text-muted">Top 3 peças</p>
                    <div className="mt-3 space-y-2 text-sm">
                      {parts.slice(0, 3).map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-3">
                          <span className="truncate font-ui font-semibold tracking-tight">
                            {p.brand ? `${p.brand} ` : ""}
                            {p.name}
                          </span>
                          <span className="text-xs text-muted shrink-0">
                            {formatBRLCompact(p.price_min ?? p.price_max ?? 0)}
                          </span>
                        </div>
                      ))}
                      {!parts.length ? (
                        <p className="text-sm text-muted">—</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                    <p className="text-xs text-muted">Status</p>
                    <div className="mt-3 grid gap-2 text-sm text-muted">
                      <span className="inline-flex items-center gap-2">
                        <Gauge className="size-4 text-accent" /> Score{" "}
                        <span className="text-foreground font-semibold tabular-nums">
                          {build.compatibility_score}%
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Layers3 className="size-4 text-accent" /> Peças{" "}
                        <span className="text-foreground font-semibold tabular-nums">
                          {parts.length}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Wrench className="size-4 text-accent" /> Orçamento peças{" "}
                        <span className="text-foreground font-semibold tabular-nums">
                          {formatBRLCompact(totalRange.mid)}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </PremiumCard>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

