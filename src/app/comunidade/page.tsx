import Image from "next/image";
import Link from "next/link";

import { WeeklyRankingGrid } from "@/components/community/weekly-ranking-grid";
import { BuildSocialActions } from "@/components/social/build-social-actions";
import { CreatorChip } from "@/components/social/creator-chip";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PremiumCard } from "@/components/ui/premium-card";
import { communityBuilds, communityCreators } from "@/lib/data/community";

export const metadata = {
  title: "Comunidade",
};

export default function ComunidadePage() {
  const highlights = [...communityBuilds]
    .sort((a, b) => Number(Boolean(b.highlighted)) - Number(Boolean(a.highlighted)) || b.baseLikes - a.baseLikes)
    .slice(0, 6);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl pt-24 pb-12">
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
                    Feed de builds, likes e ranking semanal
                  </h1>
                  <p className="mt-2 text-muted max-w-2xl">
                    Sensação de rede social gamer: destaque do dia, badges e ações sociais em tempo real (demo local).
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="warning">JDM Expert</Badge>
                    <Badge variant="danger">Drift Builder</Badge>
                    <Badge variant="secondary">Sleeper Master</Badge>
                    <Badge variant="success">Turbo Lover</Badge>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button asChild>
                    <Link href="/montar">Postar build</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/explorar">Explorar</Link>
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
                  Top builds por categoria
                </h2>
                <p className="mt-2 text-muted max-w-2xl">
                  Curta uma build e veja o ranking reagir instantaneamente.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <WeeklyRankingGrid />
            </div>
          </section>

          <section className="mt-12">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-xs text-muted">Destaques</p>
                <h2 className="mt-2 font-title text-2xl md:text-3xl tracking-tight">
                  Builds em alta agora
                </h2>
                <p className="mt-2 text-muted max-w-2xl">
                  Criadores, badges e ações sociais — com visual premium de tuning.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/explorar">Ver tudo</Link>
              </Button>
            </div>

            <div className="mt-6 flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible sm:grid sm:grid-cols-2 lg:grid-cols-3">
              {highlights.map((build) => {
                const creator = communityCreators.find((c) => c.id === build.creatorId);
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
                      <div className="absolute inset-0 pointer-events-none pg-scanlines opacity-18" />
                      <div className="absolute inset-0 pointer-events-none pg-particles opacity-45" />
                    </div>

                    <div className="relative p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-muted">{build.style}</p>
                          <Link
                            href={`/builds/${build.id}`}
                            className="block mt-1 font-title text-lg tracking-tight hover:brightness-110 transition truncate"
                          >
                            {build.name}
                          </Link>
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
                        <span className="text-muted">Orçamento</span>
                        <span className="text-foreground font-semibold">{build.priceRange}</span>
                      </div>

                      <div className="mt-5">
                        <BuildSocialActions
                          buildId={build.id}
                          baseLikes={build.baseLikes}
                          baseSaves={build.baseSaves}
                          baseComments={build.baseComments}
                        />
                      </div>
                    </div>
                  </PremiumCard>
                );
              })}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
