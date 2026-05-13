import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Gauge, Layers3, Shield, Sparkles, Wrench } from "lucide-react";

import { BuildGallery } from "@/components/build/build-gallery";
import { BuildComments } from "@/components/social/build-comments";
import { BuildSocialActions } from "@/components/social/build-social-actions";
import { CreatorChip } from "@/components/social/creator-chip";
import { NumberTicker } from "@/components/motion/number-ticker";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PremiumCard } from "@/components/ui/premium-card";
import { generateBuild } from "@/lib/builder/generate-build";
import { communityBuilds, communityCreators } from "@/lib/data/community";
import { cars, styles } from "@/lib/data/home";
import { formatBRLCompact, formatBRLRange, parseBRLRange } from "@/lib/pricing";

const relatedParts = [
  {
    id: "rp_wheels_1",
    title: "Rodas forged 18”",
    category: "Rodas",
    priceRange: "R$ 4k–8k",
    image: "/ref/car-white.jpg",
  },
  {
    id: "rp_sus_1",
    title: "Coilovers street",
    category: "Suspensão",
    priceRange: "R$ 2k–6k",
    image: "/ref/part-coilovers.jpg",
  },
  {
    id: "rp_exhaust_1",
    title: "Catback inox",
    category: "Escape",
    priceRange: "R$ 1.2k–3.5k",
    image: "/ref/part-exhaust.jpg",
  },
  {
    id: "rp_audio_1",
    title: "Sub slim + módulo",
    category: "Som",
    priceRange: "R$ 2k–7k",
    image: "/ref/part-sub.jpg",
  },
] as const;

export default async function BuildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const build = communityBuilds.find((b) => b.id === id);
  if (!build) notFound();

  const creator = communityCreators.find((c) => c.id === build.creatorId) ?? null;
  const car = cars.find((c) => c.id === build.carId) ?? null;
  const style = styles.find((s) => s.id === build.styleId) ?? null;

  const budgetRange = parseBRLRange(build.priceRange);
  const budget = Math.round(budgetRange?.mid ?? 15000);
  const generated = generateBuild({
    carId: build.carId,
    styleId: build.styleId,
    budget,
  });

  const totalParts = generated.parts.reduce(
    (acc, part) => {
      const range = parseBRLRange(part.priceRange);
      if (!range) return acc;
      return { min: acc.min + range.min, max: acc.max + range.max };
    },
    { min: 0, max: 0 }
  );
  const totalRange = {
    min: Math.round(totalParts.min),
    max: Math.round(totalParts.max),
    mid: Math.round((totalParts.min + totalParts.max) / 2),
  };

  const gallery = [
    { src: build.image, alt: build.name, label: "Hero" },
    {
      src:
        build.carId === "onix" || build.carId === "gol-g5"
          ? "/ref/car-black.jpg"
          : "/ref/car-white.jpg",
      alt: build.car,
      label: "Exterior",
    },
    { src: "/ref/hero-car.jpg", alt: build.car, label: "Street" },
    ...(build.styleId === "som"
      ? [
          { src: "/ref/part-sub.jpg", alt: "Som automotivo", label: "Som" },
          { src: "/ref/part-tip.jpg", alt: "Detalhe", label: "Detalhe" },
        ]
      : [
          { src: "/ref/part-coilovers.jpg", alt: "Suspensão", label: "Suspensão" },
          { src: "/ref/part-exhaust.jpg", alt: "Escape", label: "Escape" },
        ]),
  ];

  const similarBuilds = [...communityBuilds]
    .filter((b) => b.id !== build.id)
    .filter((b) => b.carId === build.carId || b.styleId === build.styleId)
    .slice(0, 3);

  const compatibilityVariant =
    generated.compatibilityScore >= 92
      ? "success"
      : generated.compatibilityScore >= 82
        ? "secondary"
        : generated.compatibilityScore >= 62
          ? "warning"
          : "danger";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl pt-24 pb-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-xs text-muted">Build detalhada</p>
              <h1 className="mt-2 font-title text-3xl md:text-4xl tracking-tight">
                {build.name}
              </h1>
              <p className="mt-2 text-muted max-w-2xl">
                {car?.name ?? build.car} • {style?.label ?? build.style} •{" "}
                {creator?.name ?? "Comunidade"}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Button asChild variant="outline" size="sm">
                <Link href="/explorar">
                  <ArrowLeft className="size-4" />
                  Voltar
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/montar">Copiar setup</Link>
              </Button>
            </div>
          </div>

          <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_420px] lg:items-start">
            <div className="space-y-6">
              <PremiumCard className="p-4 md:p-5">
                <BuildGallery images={gallery} />
              </PremiumCard>

              <PremiumCard className="p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{style?.label ?? build.style}</Badge>
                  <Badge variant={compatibilityVariant}>
                    <Sparkles className="mr-1 size-3" />
                    {generated.compatibilityScore}% compat.
                  </Badge>
                  <Badge variant="secondary">
                    <Layers3 className="mr-1 size-3" />
                    {build.car}
                  </Badge>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                    <p className="text-xs text-muted">Custo total (peças)</p>
                    <p className="mt-2 font-title tracking-tight">{formatBRLRange(totalRange)}</p>
                    <p className="mt-1 text-xs text-muted">Base: {formatBRLCompact(budget)}</p>
                  </div>
                  <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                    <p className="text-xs text-muted">Balanceamento</p>
                    <p className="mt-2 font-title tracking-tight">
                      <NumberTicker value={generated.balanceScore} />%
                    </p>
                    <p className="mt-1 text-xs text-muted">Estabilidade vs agressividade</p>
                  </div>
                  <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                    <p className="text-xs text-muted">Compatibilidade</p>
                    <p className="mt-2 font-title tracking-tight">
                      <NumberTicker value={generated.compatibilityScore} />%
                    </p>
                    <p className="mt-1 text-xs text-muted">Entre peças e carro</p>
                  </div>
                </div>

                {generated.alerts.length > 0 ? (
                  <div className="mt-5 rounded-4xl border border-warning/30 bg-warning/10 p-4">
                    <p className="text-sm font-ui font-semibold tracking-tight">Pontos de atenção</p>
                    <ul className="mt-2 space-y-1 text-sm text-muted">
                      {generated.alerts.slice(0, 3).map((alert) => (
                        <li key={alert.id} className="flex gap-2">
                          <Shield className="mt-0.5 size-4 text-warning shrink-0" />
                          <span>{alert.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="mt-5 rounded-4xl border border-success/30 bg-success/10 p-4">
                    <p className="text-sm font-ui font-semibold tracking-tight">Tudo conversa bem</p>
                    <p className="mt-1 text-sm text-muted">
                      Setup com encaixe limpo: poucas chances de adaptações.
                    </p>
                  </div>
                )}
              </PremiumCard>

              <PremiumCard className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted">Specs completas</p>
                    <h2 className="mt-1 font-title text-xl tracking-tight">Carro e build</h2>
                  </div>
                  <Badge variant="secondary">
                    <Gauge className="mr-1 size-3" />
                    {car?.segment ?? "Projeto"}
                  </Badge>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    { k: "Plataforma", v: car?.name ?? build.car },
                    { k: "Categoria", v: style?.label ?? build.style },
                    { k: "Potência", v: car?.power ?? "—" },
                    { k: "Consumo", v: car?.fuelConsumption ?? "—" },
                    { k: "Pontos comuns", v: car?.commonIssues ?? "—" },
                    { k: "Faixa média", v: car?.avgProjectCost ?? build.priceRange },
                  ].map((item) => (
                    <div
                      key={item.k}
                      className="rounded-4xl border border-border/70 bg-background/25 p-4"
                    >
                      <p className="text-xs text-muted">{item.k}</p>
                      <p className="mt-1 text-sm font-ui font-semibold tracking-tight">{item.v}</p>
                    </div>
                  ))}
                </div>
              </PremiumCard>

              <PremiumCard className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted">Lista de peças</p>
                    <h2 className="mt-1 font-title text-xl tracking-tight">Setup completo</h2>
                  </div>
                  <Badge variant="secondary">
                    <Wrench className="mr-1 size-3" />
                    {generated.parts.length} itens
                  </Badge>
                </div>

                <div className="mt-5 space-y-3">
                  {generated.parts.map((part) => {
                    const statusVariant =
                      part.compatibility.status === "plug_and_play"
                        ? "success"
                        : part.compatibility.status === "compatible"
                          ? "secondary"
                          : part.compatibility.status === "requires_adaptation"
                            ? "warning"
                            : "danger";

                    return (
                      <div
                        key={part.category}
                        className="rounded-4xl border border-border/70 bg-background/25 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs text-muted">{part.category}</p>
                            <p className="mt-1 font-ui font-semibold tracking-tight">{part.name}</p>
                            <p className="mt-1 text-sm text-muted">{part.priceRange}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <Badge variant={statusVariant}>{part.compatibility.score}%</Badge>
                            <p className="mt-2 text-[11px] text-muted">
                              {part.compatibility.status === "plug_and_play"
                                ? "Plug & play"
                                : part.compatibility.status === "compatible"
                                  ? "Compatível"
                                  : part.compatibility.status === "requires_adaptation"
                                    ? "Exige adaptação"
                                    : "Incompatível"}
                            </p>
                          </div>
                        </div>

                        {part.compatibility.reasons.length > 0 ? (
                          <ul className="mt-3 space-y-1 text-sm text-muted">
                            {part.compatibility.reasons.slice(0, 2).map((reason) => (
                              <li key={reason} className="flex gap-2">
                                <Shield className="mt-0.5 size-4 text-warning shrink-0" />
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </PremiumCard>

              <BuildComments buildId={build.id} baseComments={build.baseComments} />

              <PremiumCard className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted">Peças relacionadas</p>
                    <h2 className="mt-1 font-title text-xl tracking-tight">Marketplace tuning</h2>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/explorar">Ver mais</Link>
                  </Button>
                </div>

                <div className="mt-5 flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
                  {relatedParts.map((part) => (
                    <div
                      key={part.id}
                      className="snap-start shrink-0 w-[260px] rounded-4xl border border-border/70 bg-background/25 overflow-hidden"
                    >
                      <div className="relative h-28">
                        <Image src={part.image} alt="" fill className="object-cover opacity-90" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      </div>
                      <div className="p-4">
                        <p className="text-xs text-muted">{part.category}</p>
                        <p className="mt-1 font-ui font-semibold tracking-tight">{part.title}</p>
                        <p className="mt-1 text-sm text-muted">{part.priceRange}</p>
                        <div className="mt-3">
                          <Button size="sm" className="w-full">
                            Ver no marketplace
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </PremiumCard>

              <PremiumCard className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted">Builds parecidas</p>
                    <h2 className="mt-1 font-title text-xl tracking-tight">Inspiração rápida</h2>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/explorar">Explorar</Link>
                  </Button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {similarBuilds.map((other) => (
                    <Link
                      key={other.id}
                      href={`/builds/${other.id}`}
                      className="rounded-4xl border border-border/70 bg-background/25 p-4 transition hover:bg-background/35 active:scale-[0.99]"
                    >
                      <p className="text-xs text-muted">{other.style}</p>
                      <p className="mt-1 font-ui font-semibold tracking-tight truncate">
                        {other.name}
                      </p>
                      <p className="mt-1 text-sm text-muted">{other.car}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <Badge variant="secondary">{other.priceRange}</Badge>
                        <span className="text-xs text-muted tabular-nums">
                          {other.compatibility}%
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </PremiumCard>
            </div>

            <div className="space-y-4 lg:sticky lg:top-24">
              <PremiumCard className="p-6">
                {creator ? (
                  <CreatorChip name={creator.name} handle={creator.handle} badges={creator.badges} />
                ) : null}

                <div className="mt-5 grid gap-3">
                  <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                    <p className="text-xs text-muted">Orçamento estimado</p>
                    <p className="mt-2 font-title tracking-tight">{build.priceRange}</p>
                    <p className="mt-1 text-xs text-muted">
                      Total peças: {formatBRLRange(totalRange)}
                    </p>
                  </div>

                  <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                    <p className="text-xs text-muted">Social</p>
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

