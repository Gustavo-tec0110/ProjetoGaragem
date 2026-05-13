import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";

import { BuildSocialActions } from "@/components/social/build-social-actions";
import { CreatorChip } from "@/components/social/creator-chip";
import { NumberTicker } from "@/components/motion/number-ticker";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PremiumCard } from "@/components/ui/premium-card";
import { communityBuilds, communityCreators } from "@/lib/data/community";

export default async function BuildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const build = communityBuilds.find((b) => b.id === id);
  if (!build) notFound();

  const creator = communityCreators.find((c) => c.id === build.creatorId) ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl pt-24 pb-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-xs text-muted">Build</p>
              <h1 className="mt-2 font-title text-3xl md:text-4xl tracking-tight">
                {build.name}
              </h1>
              <p className="mt-2 text-muted max-w-2xl">
                {build.car} • {build.style} • compatibilidade sempre em destaque.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/explorar">Voltar para explorar</Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px] lg:items-start">
            <PremiumCard className="relative overflow-hidden">
              <div className="absolute inset-0">
                <Image
                  src={build.image}
                  alt=""
                  fill
                  priority
                  className="object-cover opacity-45 blur-[2px] scale-[1.06]"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/35" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/25" />
                <div className="absolute inset-0 pointer-events-none pg-scanlines opacity-18" />
                <div className="absolute inset-0 pointer-events-none pg-particles opacity-45" />
              </div>

              <div className="relative p-6 md:p-7">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{build.style}</Badge>
                  {build.compatibility >= 92 ? (
                    <Badge variant="success">Plug & play vibes</Badge>
                  ) : build.compatibility >= 82 ? (
                    <Badge variant="secondary">Compatível</Badge>
                  ) : (
                    <Badge variant="warning">Requer atenção</Badge>
                  )}
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {[
                    { k: "Rodas", v: "18” • offset +35" },
                    { k: "Suspensão", v: "Coilover street" },
                    { k: "Escape", v: "Catback inox" },
                    { k: "Intake", v: "Cold air intake" },
                    { k: "Bodykit", v: "Lip + side skirts" },
                    { k: "Som", v: "Kit premium compacto" },
                  ].map((item) => (
                    <div
                      key={item.k}
                      className="rounded-3xl border border-border/70 bg-background/35 px-4 py-3"
                    >
                      <p className="text-xs text-muted">{item.k}</p>
                      <p className="mt-1 text-sm font-semibold">{item.v}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-4xl border border-border/70 bg-background/25 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-ui font-semibold tracking-tight">
                      Compatibilidade
                    </p>
                    <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-ui font-semibold shadow-glow">
                      <Sparkles className="size-3 text-accent" />
                      <NumberTicker value={build.compatibility} />%
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    Score pensado para evitar combinações ruins e explicar o porquê quando
                    algo pede adaptação.
                  </p>
                </div>
              </div>
            </PremiumCard>

            <div className="space-y-4 lg:sticky lg:top-24">
              <PremiumCard className="p-6">
                {creator ? (
                  <CreatorChip
                    name={creator.name}
                    handle={creator.handle}
                    badges={creator.badges}
                  />
                ) : null}

                <div className="mt-5 grid gap-3">
                  <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                    <p className="text-xs text-muted">Orçamento estimado</p>
                    <p className="mt-2 font-title tracking-tight">{build.priceRange}</p>
                  </div>

                  <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                    <p className="text-xs text-muted">Ações sociais</p>
                    <div className="mt-3">
                      <BuildSocialActions
                        buildId={build.id}
                        baseLikes={build.baseLikes}
                        baseSaves={build.baseSaves}
                        baseComments={build.baseComments}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-2">
                  <Button asChild>
                    <Link href="/montar">Copiar setup</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/comunidade">Ver no feed</Link>
                  </Button>
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

