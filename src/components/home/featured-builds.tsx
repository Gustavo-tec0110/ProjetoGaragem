import Image from "next/image";
import Link from "next/link";

import { communityBuilds, communityCreators } from "@/lib/data/community";
import { BuildSocialActions } from "@/components/social/build-social-actions";
import { CreatorChip } from "@/components/social/creator-chip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PremiumCard } from "@/components/ui/premium-card";

export function FeaturedBuilds() {
  const builds = [...communityBuilds]
    .sort(
      (a, b) =>
        Number(Boolean(b.highlighted)) - Number(Boolean(a.highlighted)) ||
        b.baseLikes - a.baseLikes
    )
    .slice(0, 3);

  return (
    <section id="builds" className="px-4 sm:px-6 py-10 md:py-14">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs text-muted">Em destaque</p>
            <h2 className="mt-2 font-title text-2xl md:text-3xl tracking-tight">
              Builds prontas pra copiar
            </h2>
            <p className="mt-2 text-muted max-w-2xl">
              Visual forte, peças organizadas por categoria e compatibilidade sempre à vista.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/explorar">Ver tudo</Link>
          </Button>
        </div>

        <div className="mt-6 flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible sm:grid sm:grid-cols-2 lg:grid-cols-3">
          {builds.map((build) => {
            const creator = communityCreators.find((c) => c.id === build.creatorId);
            return (
            <PremiumCard
              key={build.id}
              className="group relative overflow-hidden snap-start shrink-0 w-[82%] sm:w-auto"
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
                      "radial-gradient(900px circle at 20% 10%, rgba(255,77,0,0.24), transparent 55%), radial-gradient(900px circle at 80% 35%, rgba(255,123,0,0.18), transparent 55%), linear-gradient(135deg, rgba(26,27,34,0.94), rgba(17,18,22,0.92))",
                  }}
                />
                <div className="absolute inset-0 pointer-events-none pg-scanlines opacity-18" />
                <div className="absolute inset-0 pointer-events-none pg-particles opacity-45" />
                <div
                  className="absolute inset-0 pointer-events-none opacity-60 mix-blend-overlay"
                  style={{
                    backgroundImage:
                      "linear-gradient(180deg, rgba(255,255,255,0.10), transparent 55%), linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.06) 35%, transparent 70%)",
                  }}
                />
              </div>

              <div className="relative p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted">{build.style}</p>
                    <h3 className="mt-1 font-title text-lg tracking-tight">
                      {build.name}
                    </h3>
                    <p className="mt-2 text-sm text-muted">{build.car}</p>
                  </div>
                  <Badge variant="secondary">{build.compatibility}% compat.</Badge>
                </div>

                {creator ? (
                  <div className="mt-4">
                    <CreatorChip
                      name={creator.name}
                      handle={creator.handle}
                      badges={creator.badges}
                    />
                  </div>
                ) : null}

                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className="text-muted">Orçamento estimado</span>
                  <span className="text-foreground font-semibold">{build.priceRange}</span>
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
                      <Link href="/montar">Copiar setup</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </PremiumCard>
          );
          })}
        </div>
      </div>
    </section>
  );
}
