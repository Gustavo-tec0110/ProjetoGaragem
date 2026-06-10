/**
 * Build Alerts and Recommendation Logic
 *
 * This module provides two main functions:
 *   - getBuildAlerts(projectId): evaluates a project (car) and its parts, budget, and compatibility
 *     and returns a list of alerts.
 *   - getRecommendationScore(partId, projectId): computes a simple recommendation score for a given part
 *     within the context of a specific project.
 *
 * These functions rely on Supabase client queries and the alert/recommendation rule tables
 * created in Phase 4.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase"; // Adjust path if necessary

// Types for the alert result
export type BuildAlert = {
  severity: "info" | "success" | "warning" | "danger";
  category:
    | "compatibilidade"
    | "dependência"
    | "orçamento"
    | "performance"
    | "segurança"
    | "adaptação"
    | "manutenção"
    | "legalização"
    | "confiabilidade";
  title: string;
  message: string;
  relatedPartId?: string;
};

// Helper to fetch project (car) data
async function fetchProjectData(
  supabase: SupabaseClient<Database>,
  projectId: string,
) {
  const { data: car, error } = await supabase
    .from("cars")
    .select(
      "id, engine, power_cv, engine_original, power_hp, year, brand, model",
    )
    .eq("id", projectId)
    .single();
  if (error) throw error;
  return car;
}

// Helper to fetch installed and planned parts for a project
async function fetchProjectParts(
  supabase: SupabaseClient<Database>,
  projectId: string,
) {
  const { data: parts, error } = await supabase
    .from("project_parts")
    .select(
      "id, part_id, status, category, price_paid, estimated_price, notes",
    )
    .eq("project_id", projectId);
  if (error) throw error;
  const installed = parts?.filter((p) => p.status === "installed") ?? [];
  const planned = parts?.filter((p) => p.status === "planned" || p.status === "wishlist") ?? [];
  return { installed, planned };
}

// Helper to fetch budget for a project
async function fetchProjectBudget(
  supabase: SupabaseClient<Database>,
  projectId: string,
) {
  const { data: budget, error } = await supabase
    .from("build_budgets")
    .select("budget_amount")
    .eq("project_id", projectId)
    .single();
  if (error) {
    // If no budget defined, treat as undefined
    return null;
  }
  return budget?.budget_amount ?? null;
}

// Helper to fetch alert rules for given categories
async function fetchAlertRules(
  supabase: SupabaseClient<Database>,
  categories: string[],
) {
  const { data: rules, error } = await supabase
    .from("part_alert_rules")
    .select("*")
    .in("part_category", categories);
  if (error) throw error;
  return rules ?? [];
}

/**
 * getBuildAlerts - Analisa o projeto e retorna alertas conforme regras definidas.
 */
export async function getBuildAlerts(
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<BuildAlert[]> {
  const alerts: BuildAlert[] = [];

  // Fetch necessary data
  const car = await fetchProjectData(supabase, projectId);
  const { installed, planned } = await fetchProjectParts(supabase, projectId);
  const budget = await fetchProjectBudget(supabase, projectId);

  // Helper to check if a part category exists among installed parts
  const hasInstalledCategory = (cat: string) =>
    installed.some((p) => p.category?.toLowerCase() === cat.toLowerCase());

  // Helper to get a part id for a given category (first match)
  const getInstalledPartId = (cat: string) =>
    installed.find((p) => p.category?.toLowerCase() === cat.toLowerCase())?.id;

  // 1. Turbo sem intercooler
  if (hasInstalledCategory("turbo") && !hasInstalledCategory("intercooler")) {
    alerts.push({
      severity: "warning",
      category: "compatibilidade",
      title: "Turbo sem intercooler",
      message:
        "Um turbo sem intercooler pode gerar temperaturas elevadas. Recomenda‑se instalar um intercooler ou avaliar adaptações.",
      relatedPartId: getInstalledPartId("turbo"),
    });
  }

  // 2. Turbo sem bicos/bomba/acerto (checar notas ou categoria)
  if (hasInstalledCategory("turbo")) {
    const missingFuel = !hasInstalledCategory("bomba") &&
      !hasInstalledCategory("bicos") &&
      !hasInstalledCategory("acerto");
    if (missingFuel) {
      alerts.push({
        severity: "warning",
        category: "compatibilidade",
        title: "Turbo sem alimentação adequada",
        message:
          "Turbo instalado sem bicos, bomba ou ajuste de alimentação pode causar problemas. Verifique o sistema de combustível.",
        relatedPartId: getInstalledPartId("turbo"),
      });
    }
  }

  // 3. Motor original + turbo (possível risco)
  if (car?.engine_original && hasInstalledCategory("turbo")) {
    alerts.push({
      severity: "warning",
      category: "performance",
      title: "Motor original com turbo",
      message:
        "A combinação de motor original com turbo pode exigir reforço interno. Recomenda‑se avaliação técnica.",
      relatedPartId: getInstalledPartId("turbo"),
    });
  }

  // 4. Intercooler universal – info
  if (hasInstalledCategory("intercooler")) {
    alerts.push({
      severity: "info",
      category: "adaptação",
      title: "Intercooler universal",
      message:
        "Intercooler universal costuma ser compatível, porém pode exigir adaptação de montagem. Verifique medidas antes da instalação.",
      relatedPartId: getInstalledPartId("intercooler"),
    });
  }

  // 5. Suspensão a ar – info (dependências)
  if (hasInstalledCategory("suspensao a ar") ||
      hasInstalledCategory("suspensão a ar")) {
    alerts.push({
      severity: "info",
      category: "dependência",
      title: "Suspensão a ar",
      message:
        "Suspensão a ar pode necessitar de compressor, cilindro e válvulas. Verifique dependências antes de prosseguir.",
    });
  }

  // 6. Roda maior que original – info
  if (hasInstalledCategory("roda")) {
    alerts.push({
      severity: "info",
      category: "compatibilidade",
      title: "Rodas maiores que originais",
      message:
        "Rodas maiores podem exigir ajustes na suspensão e no sistema de freios. Avalie o impacto nas medições.",
    });
  }

  // 7. Escape esportivo + turbo sem escape adequado
  if (hasInstalledCategory("escape") && hasInstalledCategory("turbo")) {
    // Assume missing"escape adequado" if no explicit "escape esportivo" part present
    const hasEsportivo = installed.some(
      (p) => p.category?.toLowerCase() === "escape esportivo",
    );
    if (!hasEsportivo) {
      alerts.push({
        severity: "warning",
        category: "compatibilidade",
        title: "Escape inadequado para turbo",
        message:
          "Um escape padrão pode não suportar o fluxo gerado por turbo. Considere um escape esportivo adequado.",
      });
    }
  }

  // 8. Peça universal – info (verificar medidas)
  if (installed.some((p) => p.category?.toLowerCase().includes("universal"))) {
    alerts.push({
      severity: "info",
      category: "adaptação",
      title: "Peça universal",
      message:
        "Peça universal pode precisar de ajustes de medida ou montagem. Verifique compatibilidade com o veículo.",
    });
  }

  // 9. Orçamento – verifica se o total planejado ultrapassa o orçamento
  if (budget !== null) {
    const totalPlanned = planned.reduce((sum, p) => {
      const est = Number(p.estimated_price ?? 0);
      return sum + (isNaN(est) ? 0 : est);
    }, 0);
    if (totalPlanned > budget) {
      alerts.push({
        severity: "warning",
        category: "orçamento",
        title: "Orçamento excedido",
        message: `Peças planejadas somam R$${totalPlanned.toFixed(
          2,
        )}, excedendo o orçamento definido de R$${Number(budget).toFixed(2)}.`,
      });
    }
  }

  // 10. Dependências com custo – se houver dependência listada e custo associado
  // Simplified: if any planned part has a note indicating "dependência" and a price, warn.
  planned.forEach((p) => {
    if (p.notes?.toLowerCase().includes("dependência")) {
      const cost = Number(p.estimated_price ?? 0);
      if (cost > 0) {
        alerts.push({
          severity: "warning",
          category: "dependência",
          title: "Dependência de peça planejada",
          message:
            "Uma peça planejada possui dependências que impactam o orçamento. Considere custos adicionais.",
          relatedPartId: p.id,
        });
      }
    }
  });

  return alerts;
}

/**
 * getRecommendationScore - calcula pontuação simples de recomendação para uma peça.
 * Utiliza impact_score, difficulty_score, risco (se houver), compatibilidade e orçamento.
 */
export async function getRecommendationScore(
  supabase: SupabaseClient<Database>,
  partId: string,
  projectId: string,
): Promise<number> {
  // Busca a peça no catálogo
  const { data: part, error: partErr } = await supabase
    .from("parts_catalog")
    .select(
      "impact_score, difficulty_score, category",
    )
    .eq("id", partId)
    .single();
  if (partErr) throw partErr;

  // Busca regras de recomendação para a categoria da peça
  const { data: recRules, error: recErr } = await supabase
    .from("part_recommendation_rules")
    .select("impact_type, impact_score, difficulty_score, risk_score, priority_score")
    .eq("part_category", part?.category ?? "")
    .maybeSingle();
  if (recErr) throw recErr;

  // Busca orçamento restante (orçamento - custo das instaladas)
  const { data: budgetData, error: budErr } = await supabase
    .from("build_budgets")
    .select("budget_amount")
    .eq("project_id", projectId)
    .single();
  const budget = budgetData?.budget_amount ?? 0;

  // Custo das partes instaladas
  const { data: installedParts, error: insErr } = await supabase
    .from("project_parts")
    .select("price_paid")
    .eq("project_id", projectId)
    .eq("status", "installed");
  const spent = installedParts?.reduce((s, p) => {
    const val = Number(p.price_paid ?? 0);
    return s + (isNaN(val) ? 0 : val);
  }, 0) ?? 0;
  const remaining = Math.max(budget - spent, 0);

  // Base score: combine impact and difficulty (higher impact, lower difficulty = better)
  const impact = Number(part?.impact_score ?? 0);
  const difficulty = Number(part?.difficulty_score ?? 0);
  const ruleImpact = Number(recRules?.impact_score ?? 0);
  const ruleDifficulty = Number(recRules?.difficulty_score ?? 0);

  // Simple formula (weights can be tuned later)
  let score = 0;
  score += impact * 2; // give weight to impact
  score -= difficulty; // penalize difficulty
  score += ruleImpact * 1.5;
  score -= ruleDifficulty;

  // Adjust by remaining budget (if part is expensive, lower score)
  // Assume estimated price is roughly proportional to impact, simplified:
  const estimatedPrice = Number(
    (await supabase
      .from("project_parts")
      .select("estimated_price")
      .eq("part_id", partId)
      .eq("project_id", projectId)
      .maybeSingle())?.data?.estimated_price ?? 0,
  );
  if (estimatedPrice > remaining) {
    score -= 10; // strong penalty if no budget
  }

  // Ensure non‑negative score
  return Math.max(0, Math.round(score));
}

// Export supabase client creator for convenience (adjust env vars as needed)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

