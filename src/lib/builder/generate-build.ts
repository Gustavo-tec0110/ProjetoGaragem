import type {
  Build,
  BuildAlert,
  BuildImpact,
  BuildPart,
  Car,
  CarId,
  CompatibilityResult,
  CompatibilityStatus,
  StyleId,
} from "@/lib/types";
import { cars, styles } from "@/lib/data/home";

function safeId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `pg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const statusOrder: Record<CompatibilityStatus, number> = {
  plug_and_play: 0,
  compatible: 1,
  requires_adaptation: 2,
  incompatible: 3,
};

function statusFromScore(score: number): CompatibilityStatus {
  if (score >= 94) return "plug_and_play";
  if (score >= 82) return "compatible";
  if (score >= 62) return "requires_adaptation";
  return "incompatible";
}

function makeCompatibility(input: {
  score: number;
  reasons?: string[];
  forceStatus?: CompatibilityStatus;
}): CompatibilityResult {
  const score = clamp(Math.round(input.score), 0, 100);
  const status = input.forceStatus ?? statusFromScore(score);
  return { score, status, reasons: input.reasons ?? [] };
}

function combineCompatibility(a: CompatibilityResult, b: CompatibilityResult): CompatibilityResult {
  const score = Math.min(a.score, b.score);
  const status = statusOrder[a.status] >= statusOrder[b.status] ? a.status : b.status;
  const reasons = Array.from(new Set([...a.reasons, ...b.reasons]));
  return { score, status, reasons };
}

function sumImpact(parts: BuildPart[]): BuildImpact {
  return parts.reduce<BuildImpact>(
    (acc, part) => ({
      suspension: acc.suspension + part.impact.suspension,
      wheel: acc.wheel + part.impact.wheel,
      engine: acc.engine + part.impact.engine,
      aesthetics: acc.aesthetics + part.impact.aesthetics,
      comfort: acc.comfort + part.impact.comfort,
      dailyUse: acc.dailyUse + part.impact.dailyUse,
    }),
    { suspension: 0, wheel: 0, engine: 0, aesthetics: 0, comfort: 0, dailyUse: 0 }
  );
}

function computeBalanceScore(impact: BuildImpact) {
  const values = [
    impact.suspension,
    impact.wheel,
    impact.engine,
    impact.aesthetics,
    impact.comfort,
    impact.dailyUse,
  ];

  const absSum = values.reduce((acc, v) => acc + Math.abs(v), 0);
  const negativeSum = values.reduce((acc, v) => acc + Math.max(0, -v), 0);

  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;

  const score = 100 - absSum * 4 - negativeSum * 5 - variance * 2;
  return clamp(Math.round(score), 0, 100);
}

function wheelCompatibility(params: {
  car: Car | undefined;
  wheelInches: number;
  wheelOffset: number;
  drop: "stock" | "mild" | "aggressive";
}) {
  const maxWheel = params.car?.wheelClearance.maxInches ?? 18;
  const minOffset = params.car?.wheelClearance.minOffset ?? 35;

  let score = 100;
  const reasons: string[] = [];
  let forceStatus: CompatibilityStatus | undefined;

  if (params.wheelInches > maxWheel) {
    const diff = params.wheelInches - maxWheel;
    score -= diff * 20;
    reasons.push(
      `Aro ${params.wheelInches}” excede a folga do ${params.car?.name ?? "carro"} (máx. ${maxWheel}”).`
    );
    if (diff >= 2) forceStatus = "incompatible";
  }

  if (params.wheelOffset < minOffset) {
    const diff = minOffset - params.wheelOffset;
    score -= diff * 6;
    reasons.push(`Offset +${params.wheelOffset} fica abaixo do recomendado (+${minOffset}).`);
    if (diff >= 6) forceStatus = "incompatible";
  }

  if (params.drop === "aggressive" && params.wheelInches >= maxWheel) {
    score -= 12;
    reasons.push("Drop agressivo + aro grande pode raspar sob compressão (perfil/alinhamento).");
    if (!forceStatus && score < 82) forceStatus = "requires_adaptation";
  }

  return makeCompatibility({ score, reasons, forceStatus });
}

export function generateBuild(input: {
  carId: CarId;
  styleId: StyleId;
  budget: number;
}): Build {
  const car = cars.find((c) => c.id === input.carId);
  const style = styles.find((s) => s.id === input.styleId);

  const wheelInches = input.budget >= 20000 ? 19 : input.budget >= 12000 ? 18 : 17;
  const wheelOffset = input.budget >= 20000 ? 35 : 38;
  const aggressiveDrop = input.styleId === "rebaixado" || input.styleId === "drift";
  const drop: "stock" | "mild" | "aggressive" = aggressiveDrop
    ? "aggressive"
    : input.styleId === "corrida" || input.styleId === "jdm" || input.styleId === "turbostreet"
      ? "mild"
      : "stock";

  const wheelCompat = wheelCompatibility({ car, wheelInches, wheelOffset, drop });

  const parts: BuildPart[] = [
    {
      category: "Rodas",
      name: `Rodas ${wheelInches}” • offset +${wheelOffset}`,
      priceRange: input.budget >= 20000 ? "R$ 4k–8k" : "R$ 2k–5k",
      compatibility: wheelCompat,
      impact: {
        suspension: 0,
        wheel: wheelInches >= 19 ? 3 : wheelInches >= 18 ? 2 : 1,
        engine: 0,
        aesthetics: wheelInches >= 19 ? 3 : 2,
        comfort: wheelInches >= 19 ? -2 : -1,
        dailyUse: wheelCompat.status === "incompatible" ? -3 : wheelCompat.status === "requires_adaptation" ? -2 : -1,
      },
    },
    {
      category: "Suspensão",
      name: aggressiveDrop ? "Coilover (drop agressivo)" : "Coilover street",
      priceRange: aggressiveDrop ? "R$ 3k–7k" : "R$ 2k–5k",
      compatibility: makeCompatibility({
        score: aggressiveDrop ? 78 : 95,
        reasons: aggressiveDrop
          ? ["Drop agressivo pode exigir ajuste de altura, cambagem e alinhamento."]
          : [],
      }),
      impact: {
        suspension: aggressiveDrop ? 3 : 2,
        wheel: 1,
        engine: 0,
        aesthetics: aggressiveDrop ? 3 : 2,
        comfort: aggressiveDrop ? -3 : -1,
        dailyUse: aggressiveDrop ? -3 : -1,
      },
    },
    {
      category: "Escape",
      name: input.styleId === "luxo" ? "Catback silencioso premium" : "Catback inox",
      priceRange: "R$ 1.2k–3.5k",
      compatibility: makeCompatibility({
        score: input.styleId === "luxo" ? 96 : 88,
        reasons:
          input.styleId === "luxo"
            ? []
            : ["Pode aumentar ruído; verifique legislação local e use abafadores adequados."],
      }),
      impact: {
        suspension: 0,
        wheel: 0,
        engine: input.styleId === "corrida" ? 3 : 2,
        aesthetics: 1,
        comfort: input.styleId === "luxo" ? 0 : -1,
        dailyUse: input.styleId === "luxo" ? 0 : -1,
      },
    },
    {
      category: "Intake",
      name: input.styleId === "turbostreet" ? "Cold air intake + filtros" : "Cold air intake",
      priceRange: "R$ 600–2k",
      compatibility: makeCompatibility({
        score: input.styleId === "turbostreet" ? 76 : 92,
        reasons:
          input.styleId === "turbostreet"
            ? ["Pode exigir acerto (tune) e manutenção mais frequente de filtros."]
            : [],
      }),
      impact: {
        suspension: 0,
        wheel: 0,
        engine: input.styleId === "turbostreet" ? 4 : 2,
        aesthetics: 0,
        comfort: 0,
        dailyUse: input.styleId === "turbostreet" ? -2 : -1,
      },
    },
    {
      category: "Multimídia",
      name: input.styleId === "luxo" ? "Multimídia premium + camera" : "Multimídia 2DIN clean",
      priceRange: "R$ 900–3k",
      compatibility: makeCompatibility({ score: 97 }),
      impact: {
        suspension: 0,
        wheel: 0,
        engine: 0,
        aesthetics: 1,
        comfort: 3,
        dailyUse: 3,
      },
    },
    {
      category: "Bodykit",
      name: style?.id === "oemplus" ? "Lip OEM+" : "Lip + side skirts",
      priceRange: "R$ 700–2.5k",
      compatibility: makeCompatibility({
        score: aggressiveDrop ? 72 : style?.id === "oemplus" ? 94 : 86,
        reasons: aggressiveDrop
          ? ["Altura baixa + lip pode raspar; pode exigir ajuste de altura/ângulo e cuidado em rampas."]
          : [],
      }),
      impact: {
        suspension: aggressiveDrop ? -1 : 0,
        wheel: 0,
        engine: 0,
        aesthetics: style?.id === "oemplus" ? 2 : 3,
        comfort: 0,
        dailyUse: aggressiveDrop ? -2 : -1,
      },
    },
    {
      category: "Iluminação",
      name: "LED + neon discreto",
      priceRange: "R$ 200–900",
      compatibility: makeCompatibility({
        score: 70,
        reasons: ["Neon/underglow pode exigir adaptação e atenção à legislação (uso em via pública)."],
        forceStatus: "requires_adaptation",
      }),
      impact: {
        suspension: 0,
        wheel: 0,
        engine: 0,
        aesthetics: 4,
        comfort: 0,
        dailyUse: -2,
      },
    },
    {
      category: "Som",
      name: input.styleId === "som" ? "Kit 2 vias + sub slim + módulo" : "Kit som compacto premium",
      priceRange: input.styleId === "som" ? "R$ 2k–7k" : "R$ 1k–4k",
      compatibility: makeCompatibility({
        score: input.styleId === "som" ? 78 : 90,
        reasons:
          input.styleId === "som"
            ? ["Pode exigir cabeamento dedicado e reforço elétrico (fusíveis/aterramento)."]
            : [],
      }),
      impact: {
        suspension: 0,
        wheel: 0,
        engine: 0,
        aesthetics: 1,
        comfort: input.styleId === "som" ? 2 : 1,
        dailyUse: input.styleId === "som" ? -1 : 0,
      },
    },
  ];

  // Cross-part rules (compatibilidade entre peças)
  const alerts: BuildAlert[] = [];

  const wheels = parts.find((p) => p.category === "Rodas") ?? null;
  const suspension = parts.find((p) => p.category === "Suspensão") ?? null;

  if (wheels && suspension && drop === "aggressive" && wheelInches >= 18) {
    const msg =
      "Rodas grandes + drop agressivo: pode precisar de ajuste de cambagem, limitadores e/ou rolagem de paralamas.";
    wheels.compatibility = combineCompatibility(
      wheels.compatibility,
      makeCompatibility({ score: 72, reasons: [msg], forceStatus: "requires_adaptation" })
    );
    suspension.compatibility = combineCompatibility(
      suspension.compatibility,
      makeCompatibility({ score: 72, reasons: [msg], forceStatus: "requires_adaptation" })
    );
  }

  for (const part of parts) {
    if (part.compatibility.status === "plug_and_play") continue;
    if (part.compatibility.status === "compatible") continue;
    for (const reason of part.compatibility.reasons) {
      alerts.push({
        id: `${part.category}_${reason}`,
        status: part.compatibility.status === "incompatible" ? "incompatible" : "requires_adaptation",
        message: reason,
        relatedCategories: [part.category],
      });
    }
  }

  const averagePartScore =
    parts.reduce((acc, p) => acc + p.compatibility.score, 0) / Math.max(1, parts.length);
  const incompatibleCount = parts.filter((p) => p.compatibility.status === "incompatible").length;
  const adaptationCount = parts.filter((p) => p.compatibility.status === "requires_adaptation").length;
  const compatibilityScore = clamp(
    Math.round(averagePartScore - incompatibleCount * 10 - adaptationCount * 3),
    0,
    100
  );

  const buildImpact = sumImpact(parts);
  const balanceScore = computeBalanceScore(buildImpact);

  return {
    id: safeId(),
    carId: input.carId,
    styleId: input.styleId,
    budget: input.budget,
    compatibilityScore,
    balanceScore,
    alerts,
    parts,
  };
}
