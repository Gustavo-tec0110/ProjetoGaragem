"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Filter, Search, X } from "lucide-react";

import { BuildSocialActions } from "@/components/social/build-social-actions";
import { CreatorChip } from "@/components/social/creator-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PremiumCard } from "@/components/ui/premium-card";
import type { CommunityBuildPost, CommunityCreator } from "@/lib/data/community";
import { parseBRLRange } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type SortKey = "likes" | "compat" | "budget";

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

export function ExploreBrowser({
  builds,
  creators,
  className,
}: {
  builds: CommunityBuildPost[];
  creators: CommunityCreator[];
  className?: string;
}) {
  const [query, setQuery] = React.useState("");
  const [carId, setCarId] = React.useState<string | null>(null);
  const [styleId, setStyleId] = React.useState<string | null>(null);
  const [minCompat, setMinCompat] = React.useState<number>(0);
  const [maxBudget, setMaxBudget] = React.useState<number>(0);
  const [sortKey, setSortKey] = React.useState<SortKey>("likes");

  const uniqueCars = React.useMemo(() => {
    const byId = new Map<string, string>();
    for (const b of builds) byId.set(b.carId, b.car);
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [builds]);

  const uniqueStyles = React.useMemo(() => {
    const byId = new Map<string, string>();
    for (const b of builds) byId.set(b.styleId, b.style);
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [builds]);

  const filtered = React.useMemo(() => {
    const q = normalizeText(query);

    const list = builds.filter((b) => {
      if (carId && b.carId !== carId) return false;
      if (styleId && b.styleId !== styleId) return false;
      if (minCompat > 0 && b.compatibility < minCompat) return false;

      if (maxBudget > 0) {
        const range = parseBRLRange(b.priceRange);
        if (!range) return false;
        if (range.min > maxBudget) return false;
      }

      if (!q) return true;
      const hay = normalizeText(`${b.name} ${b.car} ${b.style}`);
      return hay.includes(q);
    });

    const sorted = [...list].sort((a, b) => {
      if (sortKey === "compat") return b.compatibility - a.compatibility;
      if (sortKey === "budget") {
        const ar = parseBRLRange(a.priceRange)?.mid ?? 0;
        const br = parseBRLRange(b.priceRange)?.mid ?? 0;
        return br - ar;
      }
      return b.baseLikes - a.baseLikes;
    });

    return sorted;
  }, [builds, carId, maxBudget, minCompat, query, sortKey, styleId]);

  const hasFilters = query.trim().length > 0 || Boolean(carId) || Boolean(styleId) || minCompat > 0 || maxBudget > 0;

  return (
    <div className={cn("space-y-6", className)}>
      <Card className="p-5 md:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nome, carro, estilo..."
                  className="pl-11"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:flex gap-2">
              <Input
                inputMode="numeric"
                placeholder="Compat. mín."
                value={minCompat ? String(minCompat) : ""}
                onChange={(e) => setMinCompat(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
              />
              <Input
                inputMode="numeric"
                placeholder="Budget máx."
                value={maxBudget ? String(maxBudget) : ""}
                onChange={(e) => setMaxBudget(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortKey((s) => (s === "likes" ? "compat" : s === "compat" ? "budget" : "likes"))}
              >
                <Filter className="size-4" />
                {sortKey === "likes"
                  ? "Curtidas"
                  : sortKey === "compat"
                    ? "Compat."
                    : "Budget"}
              </Button>
              {hasFilters ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setCarId(null);
                    setStyleId(null);
                    setMinCompat(0);
                    setMaxBudget(0);
                  }}
                >
                  <X className="size-4" />
                  Limpar
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant={carId ? "secondary" : "default"} className="gap-2">
                Carro
              </Badge>
              {uniqueCars.map(([id, label]) => {
                const active = id === carId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCarId(active ? null : id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-ui font-semibold tracking-tight transition-colors",
                      active
                        ? "border-accent/45 bg-accent/10 text-foreground shadow-glow"
                        : "border-border/70 bg-background/35 text-muted hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant={styleId ? "secondary" : "default"} className="gap-2">
                Estilo
              </Badge>
              {uniqueStyles.map(([id, label]) => {
                const active = id === styleId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setStyleId(active ? null : id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-ui font-semibold tracking-tight transition-colors",
                      active
                        ? "border-accent/45 bg-accent/10 text-foreground shadow-glow"
                        : "border-border/70 bg-background/35 text-muted hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted">Resultados</p>
          <p className="mt-1 font-title tracking-tight text-lg">
            {filtered.length.toLocaleString("pt-BR")} builds
          </p>
          <p className="mt-1 text-sm text-muted">
            Filtros avançados (client-side) — pronto para integrar API/marketplace.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/montar">Montar</Link>
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible sm:grid sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((build) => {
          const creator = creators.find((c) => c.id === build.creatorId);
          return (
            <PremiumCard
              key={build.id}
              className="group relative overflow-hidden snap-start shrink-0 w-[86%] sm:w-auto"
            >
              <div className="absolute inset-0">
                <Image
                  src={build.image}
                  alt=""
                  fill
                  className="object-cover opacity-35 blur-[2px] scale-[1.06] transition-opacity duration-300 group-hover:opacity-45"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/20" />
                <div
                  className="absolute inset-0 opacity-85"
                  style={{
                    backgroundImage:
                      "radial-gradient(800px circle at 30% 10%, rgba(255,77,0,0.20), transparent 55%), linear-gradient(135deg, rgba(26,27,34,0.95), rgba(17,18,22,0.92))",
                  }}
                />
                <div className="absolute inset-0 pointer-events-none pg-scanlines opacity-18" />
                <div className="absolute inset-0 pointer-events-none pg-particles opacity-45" />
              </div>

              <div className="relative p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted">Build</p>
                    <Link
                      href={`/builds/${build.id}`}
                      className="block mt-1 font-title text-lg tracking-tight hover:brightness-110 transition truncate"
                    >
                      {build.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted">{build.car}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/40 px-3 py-2 text-right">
                    <p className="text-[10px] text-muted">Compat.</p>
                    <p className="text-sm font-semibold">{build.compatibility}%</p>
                  </div>
                </div>

                {creator ? (
                  <div className="mt-4">
                    <CreatorChip name={creator.name} handle={creator.handle} badges={creator.badges} />
                  </div>
                ) : null}

                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className="text-muted">{build.style}</span>
                  <Badge variant="secondary">{build.priceRange}</Badge>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  <BuildSocialActions
                    buildId={build.id}
                    baseLikes={build.baseLikes}
                    baseSaves={build.baseSaves}
                    baseComments={build.baseComments}
                  />

                  <div className="flex gap-2">
                    <Button asChild size="sm" className="flex-1">
                      <Link href={`/builds/${build.id}`}>Ver build</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link href="/montar">Copiar</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </PremiumCard>
          );
        })}
      </div>
    </div>
  );
}

