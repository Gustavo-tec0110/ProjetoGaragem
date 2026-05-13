import Link from "next/link";

import { WeeklyRankingGrid } from "@/components/community/weekly-ranking-grid";
import { Button } from "@/components/ui/button";

export function CommunityRanking() {
  return (
    <section className="px-4 sm:px-6 py-10 md:py-14">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs text-muted">Comunidade</p>
            <h2 className="mt-2 font-title text-2xl md:text-3xl tracking-tight">
              Builds mais curtidas da semana
            </h2>
            <p className="mt-2 text-muted max-w-2xl">
              Ranking por categoria (JDM, Som, Sleeper, Drift) com cara de rede social gamer.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/comunidade">Abrir ranking</Link>
          </Button>
        </div>

        <div className="mt-6">
          <WeeklyRankingGrid />
        </div>
      </div>
    </section>
  );
}
