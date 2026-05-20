"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  CarFront,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Copy,
  DollarSign,
  Flame,
  Heart,
  Shield,
  Sparkles,
  ShoppingBag,
} from "lucide-react";

import { NumberTicker } from "@/components/motion/number-ticker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cars, styles } from "@/lib/data/home";
import { encodeBuildShare } from "@/lib/share/build-share";
import type { Build, BuildPartCategory, CompatibilityStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { generateBuild } from "@/lib/builder/generate-build";
import { useBuilderStore } from "@/stores/builder-store";
import { useBuildsStore } from "@/stores/builds-store";

const steps = [
  { id: "car", label: "Carro" },
  { id: "budget", label: "Orçamento" },
  { id: "style", label: "Estilo" },
  { id: "build", label: "Build" },
] as const;

type StepId = (typeof steps)[number]["id"];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

type TuningProfile = "daily" | "attack" | "show";

const tuningProfiles: Array<{
  id: TuningProfile;
  label: string;
  hint: string;
}> = [
  { id: "daily", label: "Daily", hint: "Conforto + uso diário" },
  { id: "attack", label: "Attack", hint: "Resposta + agressividade" },
  { id: "show", label: "Show", hint: "Presença estética" },
];

type ImpactTotals = {
  suspension: number;
  wheel: number;
  engine: number;
  aesthetics: number;
  comfort: number;
  dailyUse: number;
};

function sumImpact(parts: Array<{ impact: ImpactTotals }>): ImpactTotals {
  return parts.reduce<ImpactTotals>(
    (acc, p) => ({
      suspension: acc.suspension + p.impact.suspension,
      wheel: acc.wheel + p.impact.wheel,
      engine: acc.engine + p.impact.engine,
      aesthetics: acc.aesthetics + p.impact.aesthetics,
      comfort: acc.comfort + p.impact.comfort,
      dailyUse: acc.dailyUse + p.impact.dailyUse,
    }),
    { suspension: 0, wheel: 0, engine: 0, aesthetics: 0, comfort: 0, dailyUse: 0 }
  );
}

async function copyToClipboard(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // ignore and fallback
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function normalizeKey(value: string) {
  try {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

type VisualStance = "stock" | "wide" | "ultra";
type VisualHeight = "stock" | "low" | "slammed";

function deriveVisualCompatibility(input: { build: Build | null; styleId: string | null }) {
  const wheelPart =
    input.build?.parts.find((p) => normalizeKey(p.category) === normalizeKey("Rodas")) ?? null;
  const suspensionPart =
    input.build?.parts.find((p) => normalizeKey(p.category) === normalizeKey("Suspensão")) ?? null;
  const intakePart =
    input.build?.parts.find((p) => normalizeKey(p.category) === normalizeKey("Intake")) ?? null;

  const wheelImpact = wheelPart?.impact.wheel ?? 0;
  const stance: VisualStance = wheelImpact >= 3 ? "ultra" : wheelImpact >= 2 ? "wide" : "stock";

  const suspensionName = suspensionPart ? normalizeKey(suspensionPart.name) : "";
  const height: VisualHeight =
    suspensionName.includes("agressivo") || suspensionName.includes("agressive")
      ? "slammed"
      : suspensionPart
        ? "low"
        : "stock";

  const hasTurbo = input.styleId === "turbostreet" || (intakePart?.impact.engine ?? 0) >= 4;
  const categoryLabel = hasTurbo ? "Turbo" : "NA";

  const motion = {
    scaleX: stance === "ultra" ? 1.07 : stance === "wide" ? 1.04 : 1,
    y: height === "slammed" ? 10 : height === "low" ? 6 : 0,
    rotate: stance === "ultra" ? -0.35 : 0,
    scale: height === "slammed" ? 1.03 : 1.01,
  };

  return {
    stance,
    height,
    categoryLabel,
    motion,
  };
}

function parseAvgCostRange(text: string | undefined) {
  if (!text) return null;
  const matches = Array.from(text.matchAll(/(\d+(?:[.,]\d+)?)\s*k/gi)).map((m) =>
    Number(m[1].replace(",", ".")) * 1000
  );
  if (matches.length === 0) return null;
  const min = Math.min(...matches);
  const max = Math.max(...matches);
  const mid = (min + max) / 2;
  return { min, max, mid };
}

function centeredScore(value: number, scale: number) {
  return clamp(Math.round(50 + value * scale), 0, 100);
}

function computeHudMetrics(input: {
  build: {
    compatibilityScore: number;
    balanceScore: number;
    budget: number;
    parts: Array<{ impact: ImpactTotals }>;
  };
  avgProjectCost?: string;
  profile: TuningProfile;
}) {
  const impact = sumImpact(input.build.parts);

  const comfort = centeredScore(impact.comfort, 8);
  const dailyUse = centeredScore(impact.dailyUse, 7);
  const aestheticPresence = centeredScore(impact.aesthetics, 8);
  const aggressiveness = clamp(
    Math.round(
      50 +
        impact.engine * 10 +
        impact.wheel * 8 +
        impact.aesthetics * 6 -
        impact.comfort * 4 -
        impact.dailyUse * 3
    ),
    0,
    100
  );

  const stability = clamp(
    Math.round(
      input.build.balanceScore * 0.7 +
        comfort * 0.15 +
        dailyUse * 0.15 -
        (aggressiveness - 50) * 0.12
    ),
    0,
    100
  );

  const costRange = parseAvgCostRange(input.avgProjectCost);
  const budgetFit = costRange
    ? clamp(
        Math.round(
          100 -
            (Math.abs(input.build.budget - costRange.mid) /
              Math.max(1, costRange.max - costRange.min)) *
              70
        ),
        0,
        100
      )
    : clamp(Math.round(100 - Math.max(0, input.build.budget - 12000) / 650), 0, 100);

  const costBenefit = clamp(
    Math.round(budgetFit * 0.45 + input.build.compatibilityScore * 0.35 + stability * 0.2),
    0,
    100
  );

  const weights: Record<TuningProfile, Record<string, number>> = {
    daily: {
      comfort: 0.22,
      dailyUse: 0.22,
      stability: 0.18,
      costBenefit: 0.18,
      aestheticPresence: 0.1,
      aggressiveness: 0.1,
    },
    attack: {
      aggressiveness: 0.25,
      stability: 0.2,
      costBenefit: 0.15,
      aestheticPresence: 0.15,
      comfort: 0.12,
      dailyUse: 0.13,
    },
    show: {
      aestheticPresence: 0.28,
      aggressiveness: 0.14,
      comfort: 0.12,
      dailyUse: 0.1,
      stability: 0.16,
      costBenefit: 0.2,
    },
  };

  const weighted =
    comfort * weights[input.profile].comfort +
    dailyUse * weights[input.profile].dailyUse +
    stability * weights[input.profile].stability +
    costBenefit * weights[input.profile].costBenefit +
    aestheticPresence * weights[input.profile].aestheticPresence +
    aggressiveness * weights[input.profile].aggressiveness;

  const buildScore = clamp(Math.round(input.build.compatibilityScore * 0.45 + weighted * 0.55), 0, 100);

  return {
    comfort,
    aggressiveness,
    stability,
    costBenefit,
    dailyUse,
    aestheticPresence,
    buildScore,
  };
}

function StepPill({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-4 py-2 text-sm",
        active
          ? "border-accent/45 bg-accent/10 text-foreground shadow-glow"
          : "border-border/70 bg-background/40 text-muted",
        done && !active && "border-success/35 bg-success/10 text-foreground"
      )}
    >
      {done ? (
        <CircleCheck className="size-4 text-success" />
      ) : (
        <Flame className={cn("size-4", active ? "text-accent" : "text-muted")} />
      )}
      <span className="font-ui font-semibold tracking-tight">{label}</span>
    </div>
  );
}

const statusOrder: Record<CompatibilityStatus, number> = {
  plug_and_play: 0,
  compatible: 1,
  requires_adaptation: 2,
  incompatible: 3,
};

function compatibilityMeta(status: CompatibilityStatus) {
  switch (status) {
    case "plug_and_play":
      return { label: "Plug and play", badge: "success" as const, icon: CircleCheck };
    case "compatible":
      return { label: "Compatível", badge: "success" as const, icon: CircleCheck };
    case "requires_adaptation":
      return { label: "Requer adaptação", badge: "warning" as const, icon: CircleAlert };
    case "incompatible":
      return { label: "Incompatível", badge: "danger" as const, icon: CircleAlert };
  }
}

function worstStatus(statuses: CompatibilityStatus[]): CompatibilityStatus {
  return statuses.reduce<CompatibilityStatus>((acc, s) => {
    return statusOrder[s] > statusOrder[acc] ? s : acc;
  }, "plug_and_play");
}

function StatBar({
  value,
  tone,
}: {
  value: number;
  tone: "success" | "warning" | "danger" | "accent";
}) {
  const reduceMotion = useReducedMotion();
  const track = "h-2.5 w-full rounded-full bg-border/55 overflow-hidden";
  const fillTone =
    tone === "accent"
      ? "bg-accent/90"
      : tone === "success"
        ? "bg-success"
        : tone === "warning"
          ? "bg-warning"
          : "bg-danger";

  return (
    <div className={track} aria-hidden>
      <motion.div
        className={cn("h-full rounded-full", fillTone)}
        initial={false}
        animate={{ width: `${value}%` }}
        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 22 }}
      />
    </div>
  );
}

function MetricRow({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "accent" | "success" | "warning" | "danger";
}) {
  return (
    <div className="grid grid-cols-[1fr_54px] items-start gap-3">
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted flex items-center gap-2 min-w-0">
            <span className="inline-flex size-8 items-center justify-center rounded-2xl border border-border/70 bg-background/35">
              {icon}
            </span>
            <span className="truncate">{label}</span>
          </p>
          <p className="text-xs font-semibold tabular-nums text-foreground">
            <NumberTicker value={value} />%
          </p>
        </div>
        <div className="mt-2">
          <StatBar value={value} tone={tone} />
        </div>
      </div>
    </div>
  );
}

function ImpactRow({ label, value }: { label: string; value: number }) {
  const max = 5;
  const abs = Math.min(Math.abs(value), max);
  const width = (abs / max) * 50;
  const isPositive = value >= 0;

  return (
    <div className="grid grid-cols-[1fr_160px_42px] items-center gap-3">
      <p className="text-xs text-muted">{label}</p>
      <div className="relative h-2 rounded-full bg-border/55 overflow-hidden">
        <div className="absolute inset-y-0 left-1/2 w-px bg-border/80" />
        <div
          className={cn(
            "absolute inset-y-0 rounded-full",
            isPositive ? "bg-success" : "bg-danger"
          )}
          style={
            isPositive
              ? { left: "50%", width: `${width}%` }
              : { right: "50%", width: `${width}%` }
          }
        />
      </div>
      <p className={cn("text-xs font-semibold tabular-nums", isPositive ? "text-success" : "text-danger")}>
        {value > 0 ? `+${value}` : String(value)}
      </p>
    </div>
  );
}

export function BuilderWizard() {
  const [step, setStep] = React.useState<StepId>("car");
  const [selectedCategory, setSelectedCategory] = React.useState<BuildPartCategory | null>(null);
  const [profile, setProfile] = React.useState<TuningProfile>("daily");
  const { carId, budget, styleId, build, setCarId, setBudget, setStyleId, setBuild } =
    useBuilderStore();
  const { saveBuild } = useBuildsStore();

  const [actionNote, setActionNote] = React.useState<null | "saved" | "copied" | "error">(null);
  React.useEffect(() => {
    if (!actionNote) return;
    const t = window.setTimeout(() => setActionNote(null), 1700);
    return () => window.clearTimeout(t);
  }, [actionNote]);

  const car = cars.find((c) => c.id === carId) ?? null;
  const style = styles.find((s) => s.id === styleId) ?? null;

  const visual = React.useMemo(
    () => deriveVisualCompatibility({ build, styleId }),
    [build, styleId]
  );
  const shareData = React.useMemo(() => (build ? encodeBuildShare(build) : null), [build]);
  const shareHref = build && shareData ? `/builds/${build.id}?data=${shareData}` : null;

  const completed: Record<StepId, boolean> = {
    car: Boolean(carId),
    budget: Number.isFinite(budget) && budget > 0,
    style: Boolean(styleId),
    build: Boolean(build),
  };

  const canGoBuild = completed.car && completed.budget && completed.style;
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    if (step !== "build") return;
    if (!carId || !styleId || !budget) return;
    const nextBuild = generateBuild({ carId, styleId, budget });
    setBuild(nextBuild);
  }, [budget, carId, setBuild, step, styleId]);

  const buildStatus = build ? worstStatus(build.parts.map((p) => p.compatibility.status)) : null;
  const buildMeta = buildStatus ? compatibilityMeta(buildStatus) : null;
  const buildTone =
    buildStatus === "incompatible"
      ? "danger"
      : buildStatus === "requires_adaptation"
        ? "warning"
        : "success";
  const effectiveSelectedCategory =
    build && selectedCategory && build.parts.some((p) => p.category === selectedCategory)
      ? selectedCategory
      : build?.parts[0]?.category ?? null;
  const selectedPart =
    build?.parts.find((p) => p.category === effectiveSelectedCategory) ?? null;
  const selectedMeta = selectedPart ? compatibilityMeta(selectedPart.compatibility.status) : null;

  const hud = React.useMemo(() => {
    if (!build) return null;
    return computeHudMetrics({ build, avgProjectCost: car?.avgProjectCost, profile });
  }, [build, car?.avgProjectCost, profile]);

  return (
    <div className="space-y-6">
      <header className="pg-grid-bg rounded-4xl overflow-hidden border border-border/70">
        <div className="p-6 md:p-10 relative">
          <div className="absolute -top-24 -right-24 size-72 rounded-full bg-accent/15 blur-3xl" />
          <div className="absolute -bottom-28 -left-28 size-80 rounded-full bg-accent-2/10 blur-3xl" />

          <div className="relative">
            <p className="text-xs text-muted">Montagem guiada</p>
            <h1 className="mt-2 font-title text-3xl md:text-4xl tracking-tight">
              Monte o projeto perfeito pro seu carro
            </h1>
            <p className="mt-3 text-muted max-w-2xl">
              Escolha carro, orçamento e estilo — e receba uma build pronta com alertas
              de compatibilidade, pronta pra salvar e compartilhar.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {steps.map((s) => (
                <StepPill
                  key={s.id}
                  label={s.label}
                  active={step === s.id}
                  done={completed[s.id]}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      <Card className="p-5 md:p-6 overflow-visible">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="font-title text-xl tracking-tight">Configuração</h2>
              <Badge variant={canGoBuild ? "success" : "secondary"}>
                {canGoBuild ? "Pronto pra gerar" : "Complete os passos"}
              </Badge>
            </div>

            <div className="mt-5 grid gap-4">
              <div className={cn(step !== "car" && "opacity-70")}>
                <p className="text-sm font-ui font-semibold text-foreground">1) Escolher carro</p>
                <p className="mt-1 text-sm text-muted">
                  Selecione o modelo — a compatibilidade usa isso como base.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {cars.slice(0, 6).map((c) => {
                    const selected = c.id === carId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCarId(c.id);
                          if (step === "car") setStep("budget");
                        }}
                        className={cn(
                          "text-left rounded-3xl border p-4 transition-all",
                          selected
                            ? "border-accent/45 bg-accent/10 shadow-glow"
                            : "border-border/70 bg-background/30 hover:bg-background/45"
                        )}
                      >
                        <p className="text-xs text-muted">Carro</p>
                        <p className="mt-1 font-title tracking-tight">{c.name}</p>
                        <p className="mt-2 text-xs text-muted">
                          {c.power} • {c.fuelConsumption}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              <div className={cn(step !== "budget" && "opacity-70")}>
                <p className="text-sm font-ui font-semibold text-foreground">2) Escolher orçamento</p>
                <p className="mt-1 text-sm text-muted">
                  Defina um teto — o gerador adapta peças por custo-benefício.
                </p>
                <div className="mt-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <Input
                    inputMode="numeric"
                    placeholder="Ex: 12000"
                    value={budget ? String(budget) : ""}
                    onChange={(e) => setBudget(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (budget <= 0) setBudget(12000);
                      if (step === "budget") setStep("style");
                    }}
                  >
                    Confirmar <ChevronRight className="size-4" />
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Dica: use algo como <span className="text-foreground font-semibold">8000</span>,{" "}
                  <span className="text-foreground font-semibold">12000</span> ou{" "}
                  <span className="text-foreground font-semibold">25000</span>.
                </p>
              </div>

              <Separator />

              <div className={cn(step !== "style" && "opacity-70")}>
                <p className="text-sm font-ui font-semibold text-foreground">3) Escolher estilo</p>
                <p className="mt-1 text-sm text-muted">
                  Ajusta a vibe do build, estética e escolhas de kit.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {styles.map((s) => {
                    const selected = s.id === styleId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setStyleId(s.id);
                          if (step === "style") setStep("build");
                        }}
                        className={cn(
                          "relative overflow-hidden text-left rounded-3xl border p-4 transition-all",
                          selected
                            ? "border-accent/45 shadow-glow"
                            : "border-border/70 hover:border-accent/25"
                        )}
                      >
                        <div
                          className="absolute inset-0 opacity-80"
                          style={{ backgroundImage: s.backdrop }}
                        />
                        <div className="absolute inset-0 bg-background/55" />
                        <div className="relative">
                          <p className="text-xs text-muted">Estilo</p>
                          <p className="mt-1 font-title tracking-tight">{s.label}</p>
                          <p className="mt-2 text-xs text-muted">{s.tagline}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button
                disabled={!canGoBuild}
                onClick={() => setStep("build")}
                className="sm:flex-1"
              >
                Gerar build agora <Sparkles className="size-4" />
              </Button>
              <Button variant="outline" asChild className="sm:flex-1">
                <Link href="/explorar">Explorar builds</Link>
              </Button>
            </div>
          </div>

          <div className="w-full lg:w-[420px] shrink-0 lg:self-start">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
              className="pg-glass rounded-4xl overflow-hidden lg:sticky lg:top-24 lg:max-h-[calc(100vh-120px)] lg:overflow-auto"
            >
              <div className="relative h-44">
                <Image
                  src="/ref/hero-car.jpg"
                  alt=""
                  fill
                  priority
                  className="object-cover object-right opacity-85 blur-[1px] scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/30" />
                <div
                  className="absolute inset-0 opacity-70"
                  style={{ backgroundImage: style?.backdrop ?? undefined }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />
                <div className="absolute inset-0 pointer-events-none pg-scanlines opacity-25" />
                <div className="absolute inset-0 pointer-events-none pg-particles opacity-55" />

                <motion.div
                  aria-hidden
                  initial={false}
                  animate={visual.motion}
                  transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 22 }}
                  className="absolute inset-0 pointer-events-none"
                >
                  <div className="absolute inset-x-0 bottom-0 h-44">
                    <Image
                      src={
                        carId === "onix" || carId === "gol-g5"
                          ? "/ref/car-black.jpg"
                          : "/ref/car-white.jpg"
                      }
                      alt=""
                      fill
                      className="object-cover object-center opacity-65 saturate-110 contrast-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                  </div>
                </motion.div>

                <div className="absolute left-4 top-4 right-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted">Preview lateral</p>
                    <p className="mt-1 font-title tracking-tight truncate">
                      {car ? car.name : "Selecione um carro"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted truncate">
                      {style ? style.label : "Escolha um estilo"}{" "}
                      {budget ? `• R$ ${budget.toLocaleString("pt-BR")}` : ""}
                    </p>
                    {build ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="secondary" className="gap-1">
                          <CarFront className="size-3 text-accent" />
                          {visual.stance === "ultra"
                            ? "Stance wide+"
                            : visual.stance === "wide"
                              ? "Stance wide"
                              : "Stance OEM"}
                        </Badge>
                        <Badge variant="secondary" className="gap-1">
                          <Shield className="size-3 text-accent" />
                          {visual.height === "slammed"
                            ? "Altura slammed"
                            : visual.height === "low"
                              ? "Altura low"
                              : "Altura stock"}
                        </Badge>
                        <Badge variant={visual.categoryLabel === "Turbo" ? "success" : "secondary"} className="gap-1">
                          <Flame className="size-3" />
                          {visual.categoryLabel === "Turbo" ? "Turbo" : "NA"}
                        </Badge>
                      </div>
                    ) : null}
                  </div>
                  {hud ? (
                    <motion.div
                      key={`${hud.buildScore}-${profile}`}
                      initial={reduceMotion ? false : { scale: 0.98, opacity: 0.85 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={
                        reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 26 }
                      }
                      className="rounded-3xl border border-accent/25 bg-black/35 px-4 py-2 text-right shadow-glow"
                    >
                      <p className="text-[10px] text-muted">Build score</p>
                      <p className="text-lg font-title tracking-tight">
                        <NumberTicker value={hud.buildScore} />%
                      </p>
                    </motion.div>
                  ) : (
                    <div className="rounded-3xl border border-border/70 bg-black/35 px-4 py-2 text-right">
                      <p className="text-[10px] text-muted">Build score</p>
                      <p className="text-lg font-title tracking-tight">--%</p>
                    </div>
                  )}
                </div>

                {build ? (
                  <div className="absolute inset-x-4 bottom-4 flex flex-wrap gap-2">
                    {tuningProfiles.map((p) => {
                      const active = p.id === profile;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setProfile(p.id)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-ui font-semibold tracking-tight transition-colors",
                            active
                              ? "border-accent/45 bg-accent/10 text-foreground shadow-glow"
                              : "border-border/70 bg-black/35 text-muted hover:text-foreground"
                          )}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="p-5 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted">Resumo</p>
                  <h3 className="mt-1 font-title text-lg tracking-tight">
                    {car ? car.name : "Selecione um carro"}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {style ? style.label : "Escolha um estilo"}{" "}
                    {budget ? `• R$ ${budget.toLocaleString("pt-BR")}` : ""}
                  </p>
                </div>
                {buildMeta ? (
                  <Badge variant={buildMeta.badge} className="gap-1">
                    <buildMeta.icon className="size-4" />
                    {buildMeta.label}
                  </Badge>
                ) : (
                  <Badge variant={canGoBuild ? "success" : "secondary"}>
                    {canGoBuild ? "Pronto pra gerar" : "Pendente"}
                  </Badge>
                )}
              </div>

              <Separator className="my-5" />

              {build ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-ui font-semibold">Compatibilidade</p>
                      <span className="text-xs text-muted">
                        Score{" "}
                        <span className="text-foreground font-semibold">
                          <NumberTicker value={build.compatibilityScore} />%
                        </span>
                      </span>
                    </div>
                    <StatBar value={build.compatibilityScore} tone={buildTone} />
                    <div className="flex flex-wrap gap-2">
                      {buildMeta ? (
                        <Badge variant={buildMeta.badge} className="gap-1">
                          <buildMeta.icon className="size-4" />
                          {buildMeta.label}
                        </Badge>
                      ) : null}
                      <Badge variant="secondary" className="gap-1">
                        Estabilidade{" "}
                        <span className="text-foreground font-semibold">
                          <NumberTicker value={build.balanceScore} />%
                        </span>
                      </Badge>
                    </div>
                  </div>

                  {hud ? (
                    <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-ui font-semibold tracking-tight">
                          Stats em tempo real
                        </p>
                        <span className="text-xs text-muted">
                          perfil:{" "}
                          <span className="text-foreground font-semibold">{profile}</span>
                        </span>
                      </div>
                      <div className="mt-4 space-y-3">
                        <MetricRow
                          label="Conforto"
                          value={hud.comfort}
                          tone="success"
                          icon={<Heart className="size-4 text-accent" />}
                        />
                        <MetricRow
                          label="Agressividade"
                          value={hud.aggressiveness}
                          tone="accent"
                          icon={<Flame className="size-4 text-accent" />}
                        />
                        <MetricRow
                          label="Estabilidade"
                          value={hud.stability}
                          tone="success"
                          icon={<Shield className="size-4 text-accent" />}
                        />
                        <MetricRow
                          label="Custo-benefício"
                          value={hud.costBenefit}
                          tone="success"
                          icon={<DollarSign className="size-4 text-accent" />}
                        />
                        <MetricRow
                          label="Uso diário"
                          value={hud.dailyUse}
                          tone="success"
                          icon={<CarFront className="size-4 text-accent" />}
                        />
                        <MetricRow
                          label="Presença estética"
                          value={hud.aestheticPresence}
                          tone="accent"
                          icon={<Sparkles className="size-4 text-accent" />}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-ui font-semibold">Peças</p>
                      <span className="text-xs text-muted">Toque para ver impacto</span>
                    </div>
                    <div className="space-y-2">
                      {build.parts.map((p) => {
                        const meta = compatibilityMeta(p.compatibility.status);
                        const Icon = meta.icon;
                        const selected = p.category === effectiveSelectedCategory;
                        const toneBorder =
                          p.compatibility.status === "incompatible"
                            ? "border-danger/30"
                            : p.compatibility.status === "requires_adaptation"
                              ? "border-warning/30"
                              : "border-success/25";

                        return (
                          <button
                            key={p.category}
                            type="button"
                            onClick={() => setSelectedCategory(p.category)}
                            className={cn(
                              "w-full text-left rounded-3xl border px-3 py-3 transition-all",
                              selected
                                ? "border-accent/45 bg-accent/10 shadow-glow"
                                : cn(
                                    toneBorder,
                                    "bg-background/35 hover:bg-background/55"
                                  )
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs text-muted">{p.category}</p>
                                <p className="mt-0.5 text-sm font-semibold truncate">{p.name}</p>
                                <p className="mt-1 text-xs text-muted">{p.priceRange}</p>
                              </div>
                              <div className="shrink-0 flex flex-col items-end gap-1">
                                <Badge variant={meta.badge} className="gap-1">
                                  <Icon className="size-4" />
                                  <span className="hidden sm:inline">{meta.label}</span>
                                </Badge>
                                <span
                                  className={cn(
                                    "text-xs font-semibold tabular-nums",
                                    meta.badge === "danger"
                                      ? "text-danger"
                                      : meta.badge === "warning"
                                        ? "text-warning"
                                        : "text-success"
                                  )}
                                >
                                  <NumberTicker value={p.compatibility.score} />%
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedPart ? (
                    <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-muted">{selectedPart.category}</p>
                          <p className="mt-0.5 text-sm font-semibold truncate">
                            {selectedPart.name}
                          </p>
                          <p className="mt-1 text-xs text-muted">{selectedPart.priceRange}</p>
                        </div>
                        {selectedMeta ? (
                          <Badge variant={selectedMeta.badge} className="gap-1 shrink-0">
                            <selectedMeta.icon className="size-4" />
                            {selectedMeta.label}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-muted">Score de compatibilidade</p>
                        <p className="text-xs font-semibold">
                          <NumberTicker value={selectedPart.compatibility.score} />%
                        </p>
                      </div>

                      {selectedPart.compatibility.reasons.length > 0 ? (
                        <div
                          className={cn(
                            "mt-3 rounded-3xl border p-3",
                            selectedPart.compatibility.status === "incompatible"
                              ? "border-danger/30 bg-danger/10"
                              : "border-warning/30 bg-warning/10"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <CircleAlert
                              className={cn(
                                "mt-0.5 size-4",
                                selectedPart.compatibility.status === "incompatible"
                                  ? "text-danger"
                                  : "text-warning"
                              )}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-ui font-semibold tracking-tight">
                                Alertas desta peça
                              </p>
                              <ul className="mt-2 space-y-1 text-xs text-muted">
                                {selectedPart.compatibility.reasons.map((r) => (
                                  <li key={r}>• {r}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 rounded-3xl border border-success/30 bg-success/10 p-3">
                          <div className="flex items-start gap-2">
                            <CircleCheck className="mt-0.5 size-4 text-success" />
                            <div>
                              <p className="text-xs font-ui font-semibold tracking-tight">
                                Sem alertas
                              </p>
                              <p className="mt-1 text-xs text-muted">
                                Esta peça está segura no setup atual.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-ui font-semibold tracking-tight">
                          Impacto ao selecionar
                        </p>
                        <div className="space-y-2">
                          <ImpactRow label="Suspensão" value={selectedPart.impact.suspension} />
                          <ImpactRow label="Roda" value={selectedPart.impact.wheel} />
                          <ImpactRow label="Motor" value={selectedPart.impact.engine} />
                          <ImpactRow label="Estética" value={selectedPart.impact.aesthetics} />
                          <ImpactRow label="Conforto" value={selectedPart.impact.comfort} />
                          <ImpactRow label="Uso diário" value={selectedPart.impact.dailyUse} />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {build.alerts.length > 0 ? (
                    <div className="space-y-3">
                      {build.alerts.some((a) => a.status === "incompatible") ? (
                        <div className="rounded-3xl border border-danger/30 bg-danger/10 p-4">
                          <div className="flex items-start gap-3">
                            <CircleAlert className="mt-0.5 size-5 text-danger" />
                            <div>
                              <p className="font-ui font-semibold tracking-tight">
                                Incompatibilidades
                              </p>
                              <ul className="mt-2 space-y-1 text-sm text-muted">
                                {build.alerts
                                  .filter((a) => a.status === "incompatible")
                                  .map((a) => (
                                    <li key={a.id}>• {a.message}</li>
                                  ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {build.alerts.some((a) => a.status === "requires_adaptation") ? (
                        <div className="rounded-3xl border border-warning/30 bg-warning/10 p-4">
                          <div className="flex items-start gap-3">
                            <CircleAlert className="mt-0.5 size-5 text-warning" />
                            <div>
                              <p className="font-ui font-semibold tracking-tight">
                                Requer adaptação
                              </p>
                              <ul className="mt-2 space-y-1 text-sm text-muted">
                                {build.alerts
                                  .filter((a) => a.status === "requires_adaptation")
                                  .map((a) => (
                                    <li key={a.id}>• {a.message}</li>
                                  ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-success/30 bg-success/10 p-4">
                      <div className="flex items-start gap-3">
                        <CircleCheck className="mt-0.5 size-5 text-success" />
                        <div>
                          <p className="font-ui font-semibold tracking-tight">Tudo compatível</p>
                          <p className="mt-1 text-sm text-muted">
                            Plug and play: sem adaptações críticas no setup atual.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      disabled={!build}
                      onClick={() => {
                        if (!build) return;
                        const title = `${car?.name ?? "Carro"} • ${style?.label ?? "Estilo"} • R$ ${budget.toLocaleString(
                          "pt-BR"
                        )}`;
                        saveBuild({ build, title });
                        setActionNote("saved");
                      }}
                    >
                      {actionNote === "saved" ? "Salvo!" : "Salvar build"}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={!build || !shareHref}
                      onClick={async () => {
                        if (!shareHref) return;
                        const url = `${window.location.origin}${shareHref}`;
                        const ok = await copyToClipboard(url);
                        setActionNote(ok ? "copied" : "error");
                      }}
                    >
                      <Copy className="size-4" />
                      {actionNote === "copied" ? "Link copiado" : "Compartilhar"}
                    </Button>
                  </div>

                  {shareHref ? (
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                      <Link href={shareHref} className="text-muted underline hover:text-foreground transition">
                        Abrir página pública
                      </Link>
                      {actionNote === "error" ? (
                        <span className="text-danger">Falha ao copiar</span>
                      ) : actionNote === "saved" ? (
                        <span className="text-success">Build salva</span>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="rounded-3xl border border-border/70 bg-background/35 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-ui font-semibold tracking-tight">
                        Comprar peças (afiliados)
                      </p>
                      <ShoppingBag className="size-4 text-accent" />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Botões premium prontos para integrar links de afiliado.
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Button variant="outline" size="sm">
                        Mercado Livre
                      </Button>
                      <Button variant="outline" size="sm">
                        Amazon
                      </Button>
                      <Button variant="outline" size="sm">
                        Shopee
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-border/70 bg-background/35 p-4 text-sm text-muted">
                  Complete os passos para gerar uma build pronta e ver as peças com compatibilidade.
                </div>
              )}
              </div>
            </motion.div>
          </div>
        </div>
      </Card>
    </div>
  );
}
