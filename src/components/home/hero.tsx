"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BadgeCheck, Layers, Sparkles, Users } from "lucide-react";

import { NumberTicker } from "@/components/motion/number-ticker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PremiumCard } from "@/components/ui/premium-card";
import { formatBRLCompact } from "@/lib/pricing";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type FeaturedBuild = {
  slug: string;
  title: string;
  style: string;
  compatibility_score: number;
  budget_min: number | null;
  budget_max: number | null;
  car_id: string;
  car_photo_url: string | null;
  carName: string;
};

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

export function Hero() {
  const reduceMotion = useReducedMotion();

  const [counts, setCounts] = React.useState<{
    builds: number | null;
    parts: number | null;
  }>({ builds: null, parts: null });

  const [featured, setFeatured] = React.useState<FeaturedBuild | null>(null);
  const [loading, setLoading] = React.useState(() => isSupabaseConfigured);

  React.useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    void Promise.all([
      supabase.from("builds").select("id", { count: "exact", head: true }).eq("is_public", true),
      supabase.from("parts").select("id", { count: "exact", head: true }),
      supabase
        .from("builds")
        .select("slug, title, style, compatibility_score, budget_min, budget_max, car_id, car_photo_url, created_at")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
      .then(async ([buildsCountRes, partsCountRes, featuredRes]) => {
        if (!mounted) return;

        setCounts({
          builds: buildsCountRes.count ?? null,
          parts: partsCountRes.count ?? null,
        });

        const b = featuredRes.data as null | {
          slug: string;
          title: string;
          style: string;
          compatibility_score: number;
          budget_min: number | null;
          budget_max: number | null;
          car_id: string;
          car_photo_url: string | null;
        };

        if (!b) {
          setFeatured(null);
          return;
        }

        const { data: car } = await supabase
          .from("cars")
          .select("name, slug")
          .eq("id", b.car_id)
          .maybeSingle();

        setFeatured({
          ...b,
          carName: car?.name ?? "Carro",
          car_id: b.car_id,
          car_photo_url: b.car_photo_url,
        });
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const stats = [
    {
      label: "Builds públicas",
      value: counts.builds,
      icon: <Users className="size-4 text-accent" />,
    },
    {
      label: "Peças cadastradas",
      value: counts.parts,
      icon: <Layers className="size-4 text-accent" />,
    },
  ] as const;

  const featuredBudget =
    featured?.budget_min != null && featured?.budget_max != null
      ? `${formatBRLCompact(featured.budget_min)}–${formatBRLCompact(featured.budget_max)}`
      : featured?.budget_max != null
        ? `Até ${formatBRLCompact(featured.budget_max)}`
        : "—";

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 pg-grid-bg" />

      <div className="absolute inset-0">
        <motion.div
          aria-hidden
          className="absolute inset-0"
          animate={
            reduceMotion
              ? undefined
              : {
                  scale: [1.04, 1.075, 1.04],
                  x: [0, -10, 0],
                  y: [0, 8, 0],
                }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 18, repeat: Infinity, ease: "easeInOut" }
          }
        >
          <Image
            src="/ref/hero-car.jpg"
            alt=""
            fill
            priority
            className="object-cover object-right opacity-55 blur-2xl scale-[1.08]"
          />
        </motion.div>

        <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/78 to-black/34" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/48" />
        <div className="absolute inset-0 pointer-events-none pg-particles opacity-35" />
        <div className="absolute inset-0 pointer-events-none pg-scanlines opacity-20" />
        <div
          className="absolute inset-0 pointer-events-none opacity-70 mix-blend-overlay"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(255,255,255,0.12), transparent 40%), linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.08) 35%, transparent 70%)",
          }}
        />

        <div className="absolute inset-0 opacity-45">
          <div className="absolute -top-28 left-1/2 -translate-x-1/2 size-[760px] rounded-full bg-accent/14 blur-3xl" />
          <div className="absolute -bottom-44 -left-32 size-[600px] rounded-full bg-accent-2/12 blur-3xl" />
          <div className="absolute top-16 -right-36 size-[560px] rounded-full bg-accent/10 blur-3xl" />
        </div>
      </div>

      <div className="relative px-4 sm:px-6 pt-24 pb-12 md:pb-16">
        <div className="mx-auto w-full max-w-6xl grid gap-10 lg:grid-cols-2 lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-2">
                <Sparkles className="size-3 text-accent" />
                Planejador de build
              </Badge>
              <Badge variant="default" className="gap-2 border-accent/25 bg-black/35">
                <BadgeCheck className="size-3 text-accent" />
                Dados reais (Supabase)
              </Badge>
            </div>

            <h1 className="mt-4 font-title text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.05]">
              Tuning com cara de jogo.
              <br />
              <span className="text-accent">Builds compatíveis</span> em minutos.
            </h1>

            <p className="mt-4 text-muted text-lg leading-relaxed max-w-xl">
              Monte setups com score dinâmico, orçamento em tempo real e peças por
              categoria — pronto pra salvar e compartilhar.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg">
                <Link href="/montar">
                  Montar build <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/comunidade">Ver comunidade</Link>
              </Button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-4xl border border-border/70 bg-background/20 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted">{s.label}</p>
                    <span className="inline-flex size-9 items-center justify-center rounded-3xl border border-border/70 bg-background/35">
                      {s.icon}
                    </span>
                  </div>
                  <p className="mt-2 font-title tracking-tight">
                    {s.value == null ? (
                      "—"
                    ) : (
                      <NumberTicker
                        value={s.value}
                        format={(v) => Math.round(v).toLocaleString("pt-BR")}
                      />
                    )}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.05, ease: [0.2, 0.8, 0.2, 1] }}
            className="lg:justify-self-end"
          >
            <PremiumCard className="relative overflow-hidden w-full max-w-xl">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "radial-gradient(900px circle at 20% 10%, rgba(255,77,0,0.28), transparent 55%), radial-gradient(900px circle at 80% 35%, rgba(255,123,0,0.18), transparent 55%), linear-gradient(135deg, rgba(26,27,34,0.92), rgba(17,18,22,0.90))",
                }}
              />
              <div className="absolute inset-0 pointer-events-none pg-scanlines opacity-22" />
              <div className="absolute inset-0 pointer-events-none pg-particles opacity-50" />

              <div className="relative p-6 md:p-7">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted">
                      {featured ? "Build em destaque" : "Sem build pública ainda"}
                    </p>
                    <h2 className="mt-1 font-title text-xl tracking-tight truncate">
                      {featured ? featured.title : "Crie a primeira build"}
                    </h2>
                    <p className="mt-1 text-sm text-muted truncate">
                      {featured ? `${featured.carName} • ${featured.style}` : "Poste pelo planejador"}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-accent/30 bg-accent/10 px-4 py-2 shadow-glow">
                    <p className="text-[10px] text-muted">Orçamento</p>
                    <p className="text-sm font-semibold">{featuredBudget}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <div className="rounded-3xl border border-border/70 bg-background/35 px-4 py-3">
                    <p className="text-xs text-muted">Compatibilidade</p>
                    <p className="mt-1 text-sm font-semibold">
                      {featured ? `${featured.compatibility_score}%` : "—"}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-border/70 bg-background/35 px-4 py-3">
                    <p className="text-xs text-muted">Card compartilhável</p>
                    <p className="mt-1 text-sm font-semibold">OG automático</p>
                  </div>
                  <div className="rounded-3xl border border-border/70 bg-background/35 px-4 py-3">
                    <p className="text-xs text-muted">Peças</p>
                    <p className="mt-1 text-sm font-semibold">Catálogo real</p>
                  </div>
                  <div className="rounded-3xl border border-border/70 bg-background/35 px-4 py-3">
                    <p className="text-xs text-muted">Feed</p>
                    <p className="mt-1 text-sm font-semibold">Likes reais</p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <Button asChild size="sm">
                    <Link href="/montar">Montar build</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={featured ? `/builds/${featured.slug}` : "/comunidade"}>
                      {featured ? "Ver build" : "Ver feed"}
                    </Link>
                  </Button>
                </div>

                {!isSupabaseConfigured ? (
                  <p className="mt-4 text-xs text-muted">
                    Configure Supabase para ver contagens e destaque.
                  </p>
                ) : loading ? (
                  <p className="mt-4 text-xs text-muted">Carregando dados…</p>
                ) : null}
              </div>
            </PremiumCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

