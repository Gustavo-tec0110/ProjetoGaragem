import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Star } from "lucide-react";

import {
  communityBadgeLabels,
  communityBuilds,
  communityCreators,
  type CommunityBadgeId,
} from "@/lib/data/community";
import { BuildSocialActions } from "@/components/social/build-social-actions";
import { NumberTicker } from "@/components/motion/number-ticker";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PremiumCard } from "@/components/ui/premium-card";

const badgeTone: Record<
  CommunityBadgeId,
  "secondary" | "warning" | "danger" | "success"
> = {
  jdm_expert: "warning",
  drift_builder: "danger",
  sleeper_master: "secondary",
  turbo_lover: "success",
};

export default async function PerfilPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const creator = communityCreators.find((c) => c.handle === handle);
  if (!creator) notFound();

  const builds = communityBuilds.filter((b) => b.creatorId === creator.id);
  const totalLikes = builds.reduce((acc, b) => acc + b.baseLikes, 0);
  const totalSaves = builds.reduce((acc, b) => acc + b.baseSaves, 0);

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
                className="object-cover object-right opacity-40 blur-[2px] scale-[1.06]"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/70 to-black/35" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/40 to-black/30" />
              <div className="absolute inset-0 pointer-events-none pg-scanlines opacity-16" />
              <div className="absolute inset-0 pointer-events-none pg-particles opacity-40" />
            </div>

            <div className="relative p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div className="min-w-0">
                  <p className="text-xs text-muted">Perfil automotivo</p>
                  <h1 className="mt-2 font-title text-3xl md:text-4xl tracking-tight truncate">
                    {creator.name}
                  </h1>
                  <p className="mt-2 text-muted max-w-2xl">{creator.tagline}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {creator.badges.map((b) => (
                      <Badge key={b} variant={badgeTone[b]}>
                        {communityBadgeLabels[b]}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2 text-sm text-muted">
                    <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/35 px-4 py-2">
                      <MapPin className="size-4 text-accent" /> {creator.location}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/35 px-4 py-2">
                      <Star className="size-4 text-accent" /> {creator.favoriteCar}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 md:max-w-md w-full">
                  {[
                    { label: "Builds", value: builds.length },
                    { label: "Curtidas", value: totalLikes },
                    { label: "Saves", value: totalSaves },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-4xl border border-border/70 bg-background/25 p-4"
                    >
                      <p className="text-xs text-muted">{s.label}</p>
                      <p className="mt-2 font-title tracking-tight">
                        <NumberTicker
                          value={s.value}
                          format={(v) => Math.round(v).toLocaleString("pt-BR")}
                        />
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-2">
                <Button asChild>
                  <Link href="/comunidade">Ver feed</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/montar">Montar uma build</Link>
                </Button>
              </div>
            </div>
          </PremiumCard>

          <div className="mt-10 flex items-end justify-between gap-6">
            <div>
              <p className="text-xs text-muted">Garagem</p>
              <h2 className="mt-2 font-title text-2xl md:text-3xl tracking-tight">
                Builds do criador
              </h2>
              <p className="mt-2 text-muted max-w-2xl">
                Curtidas, comentários e saves atualizam em tempo real (demo local).
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {builds.map((build) => (
              <PremiumCard key={build.id} className="group relative overflow-hidden">
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

                <div className="relative p-6">
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
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

