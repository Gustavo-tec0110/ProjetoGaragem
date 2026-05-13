"use client";

import * as React from "react";
import Link from "next/link";

import { communityBuilds, communityCreators } from "@/lib/data/community";
import { PremiumCard } from "@/components/ui/premium-card";
import { Badge } from "@/components/ui/badge";
import { useSocialStore } from "@/stores/social-store";

type RankingItem = {
  category: string;
  buildId: string;
  buildName: string;
  car: string;
  likes: number;
  creatorHandle: string;
  creatorName: string;
};

function formatCount(value: number) {
  return value.toLocaleString("pt-BR");
}

export function WeeklyRankingGrid({ className }: { className?: string }) {
  const liked = useSocialStore((s) => s.liked);

  const ranking = React.useMemo(() => {
    const likeDelta = (id: string) => (liked[id] ? 1 : 0);

    const categories: Array<{ label: string; styleId: string }> = [
      { label: "JDM", styleId: "jdm" },
      { label: "Som", styleId: "som" },
      { label: "Sleeper", styleId: "sleeper" },
      { label: "Drift", styleId: "drift" },
    ];

    const items: RankingItem[] = [];

    for (const category of categories) {
      const best = communityBuilds
        .filter((b) => b.styleId === category.styleId)
        .slice()
        .sort(
          (a, b) =>
            b.baseLikes + likeDelta(b.id) - (a.baseLikes + likeDelta(a.id))
        )[0];

      if (!best) continue;
      const creator = communityCreators.find((c) => c.id === best.creatorId);
      items.push({
        category: category.label,
        buildId: best.id,
        buildName: best.name,
        car: best.car,
        likes: best.baseLikes + likeDelta(best.id),
        creatorHandle: creator?.handle ?? "membro",
        creatorName: creator?.name ?? "Membro",
      });
    }

    return items;
  }, [liked]);

  return (
    <div className={className}>
      <div className="grid gap-4 md:grid-cols-2">
        {ranking.map((item) => (
          <PremiumCard key={item.buildId} className="relative overflow-hidden p-6">
            <div
              className="absolute inset-0 opacity-85"
              style={{
                backgroundImage:
                  "radial-gradient(900px circle at 20% 10%, rgba(255,77,0,0.16), transparent 60%), linear-gradient(135deg, rgba(26,27,34,0.90), rgba(17,18,22,0.92))",
              }}
            />
            <div className="absolute inset-0 pointer-events-none pg-scanlines opacity-16" />
            <div className="absolute inset-0 pointer-events-none pg-particles opacity-35" />

            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Badge variant="secondary">{item.category}</Badge>
                <Link
                  href={`/builds/${item.buildId}`}
                  className="block mt-3 font-title text-lg tracking-tight hover:brightness-110 transition truncate"
                >
                  {item.buildName}
                </Link>
                <p className="mt-1 text-sm text-muted truncate">{item.car}</p>
                <Link
                  href={`/perfil/${item.creatorHandle}`}
                  className="mt-3 inline-flex text-xs font-ui font-semibold text-muted hover:text-foreground transition"
                >
                  por @{item.creatorHandle}
                </Link>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background/35 px-4 py-3 text-right">
                <p className="text-[10px] text-muted">Curtidas</p>
                <p className="text-base font-semibold tabular-nums">
                  {formatCount(item.likes)}
                </p>
              </div>
            </div>
          </PremiumCard>
        ))}
      </div>
    </div>
  );
}

