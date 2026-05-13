import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Button } from "@/components/ui/button";
import { PremiumCard } from "@/components/ui/premium-card";
import { Badge } from "@/components/ui/badge";
import { BuildSocialActions } from "@/components/social/build-social-actions";
import { CreatorChip } from "@/components/social/creator-chip";
import { communityBuilds, communityCreators } from "@/lib/data/community";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Explorar",
};

export default function ExplorarPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl pt-24 pb-12">
          <h1 className="font-title text-3xl md:text-4xl tracking-tight">
            Explorar Builds
          </h1>
          <p className="mt-2 text-muted max-w-2xl">
            Builds prontas, kits compatíveis e inspiração visual — do JDM ao
            Luxo, com cara de app premium.
          </p>

          <div className="mt-8 flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {[...communityBuilds]
              .sort((a, b) => b.baseLikes - a.baseLikes)
              .map((build) => {
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
                      <p className="text-sm font-semibold">
                        {build.compatibility}%
                      </p>
                    </div>
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
      </main>
      <SiteFooter />
    </div>
  );
}
