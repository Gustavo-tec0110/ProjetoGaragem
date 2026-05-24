import Link from "next/link";

import { PremiumCard } from "@/components/ui/premium-card";
import { Badge } from "@/components/ui/badge";

type RankingItem = {
  category: string;
  buildSlug: string;
  buildName: string;
  car: string;
  likes: number;
  creatorHandle: string;
};

function formatCount(value: number) {
  return value.toLocaleString("pt-BR");
}

export function WeeklyRankingGrid({
  items,
  className,
}: {
  items: RankingItem[];
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory md:mx-0 md:px-0 md:pb-0 md:overflow-visible md:grid md:grid-cols-2">
        {items.map((item) => (
          <PremiumCard
            key={item.buildSlug}
            className="relative overflow-hidden p-5 sm:p-6 snap-start shrink-0 w-[86%] md:w-auto"
          >
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
                  href={`/builds/${item.buildSlug}`}
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
