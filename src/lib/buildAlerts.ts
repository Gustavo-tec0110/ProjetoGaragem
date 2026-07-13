/**
 * Build Alerts and Recommendation Logic
 *
 * MVP note:
 * The active project UI uses cars, car_parts and car_expenses. Older Phase 4
 * experiments used project_parts, parts_catalog and build_budgets. This file
 * must not depend on those legacy tables while the MVP is live.
 */

import { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../types/supabase";

export type BuildAlert = {
  severity: "info" | "success" | "warning" | "danger";
  category:
    | "compatibilidade"
    | "dependencia"
    | "orcamento"
    | "performance"
    | "seguranca"
    | "adaptacao"
    | "manutencao"
    | "legalizacao"
    | "confiabilidade";
  title: string;
  message: string;
  relatedPartId?: string;
};

type AlertCar = {
  id: string;
  engine: string | null;
  power_cv: number | null;
  year: number;
  brand: string;
  model: string;
  original_engine_answer: string | null;
};

type AlertPart = {
  id: string;
  name: string;
  category: string;
  status: "installed" | "planned" | "removed";
  priority: string | null;
  price_estimate: number | null;
  description: string | null;
};

type AlertExpense = {
  amount: number;
};

async function fetchProjectData(
  supabase: SupabaseClient<Database>,
  projectId: string,
) {
  const { data: car, error } = await supabase
    .from("cars")
    .select("id, engine, power_cv, year, brand, model, original_engine_answer")
    .eq("id", projectId)
    .single();

  if (error) throw error;
  return car as AlertCar;
}

async function fetchProjectParts(
  supabase: SupabaseClient<Database>,
  projectId: string,
) {
  const { data: parts, error } = await supabase
    .from("car_parts")
    .select("id, name, category, status, priority, price_estimate, description")
    .eq("car_id", projectId);

  if (error) throw error;

  const rows = (parts ?? []) as AlertPart[];
  return {
    installed: rows.filter((part) => part.status === "installed"),
    planned: rows.filter((part) => part.status === "planned"),
  };
}

async function fetchProjectExpenses(
  supabase: SupabaseClient<Database>,
  projectId: string,
) {
  const { data: expenses, error } = await supabase
    .from("car_expenses")
    .select("amount")
    .eq("car_id", projectId);

  if (error) throw error;
  return (expenses ?? []) as AlertExpense[];
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function partText(part: AlertPart) {
  return normalizeText([part.name, part.category, part.description, part.priority].filter(Boolean).join(" "));
}

function matchesAny(part: AlertPart, terms: string[]) {
  const text = partText(part);
  return terms.some((term) => text.includes(normalizeText(term)));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function getBuildAlerts(
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<BuildAlert[]> {
  const alerts: BuildAlert[] = [];

  try {
    const car = await fetchProjectData(supabase, projectId);
    const { installed, planned } = await fetchProjectParts(supabase, projectId);
    const expenses = await fetchProjectExpenses(supabase, projectId);

    const hasInstalledTerm = (terms: string[]) =>
      installed.some((part) => matchesAny(part, terms));
    const getInstalledPartId = (terms: string[]) =>
      installed.find((part) => matchesAny(part, terms))?.id;

    const turboTerms = ["turbo"];
    const intercoolerTerms = ["intercooler"];
    const fuelTerms = ["bomba", "bico", "bicos", "injecao", "injeção", "acerto", "fuel"];

    if (hasInstalledTerm(turboTerms) && !hasInstalledTerm(intercoolerTerms)) {
      alerts.push({
        severity: "warning",
        category: "compatibilidade",
        title: "Turbo sem intercooler",
        message:
          "Um turbo sem intercooler pode gerar temperaturas elevadas. Avalie intercooler ou adaptacoes de arrefecimento.",
        relatedPartId: getInstalledPartId(turboTerms),
      });
    }

    if (hasInstalledTerm(turboTerms) && !hasInstalledTerm(fuelTerms)) {
      alerts.push({
        severity: "warning",
        category: "compatibilidade",
        title: "Turbo sem alimentacao adequada",
        message:
          "Turbo instalado sem bicos, bomba ou acerto cadastrado pode causar mistura pobre e risco mecanico.",
        relatedPartId: getInstalledPartId(turboTerms),
      });
    }

    if (car.original_engine_answer === "yes" && hasInstalledTerm(turboTerms)) {
      alerts.push({
        severity: "warning",
        category: "performance",
        title: "Motor original com turbo",
        message:
          "A combinacao de motor original com turbo pode exigir reforco interno e avaliacao tecnica.",
        relatedPartId: getInstalledPartId(turboTerms),
      });
    }

    if (hasInstalledTerm(intercoolerTerms) && hasInstalledTerm(["universal"])) {
      alerts.push({
        severity: "info",
        category: "adaptacao",
        title: "Intercooler universal",
        message:
          "Intercooler universal costuma ser compativel, mas pode exigir adaptacao de montagem e medidas.",
        relatedPartId: getInstalledPartId(intercoolerTerms),
      });
    }

    if (hasInstalledTerm(["suspensao a ar", "suspensão a ar"])) {
      alerts.push({
        severity: "info",
        category: "dependencia",
        title: "Suspensao a ar",
        message:
          "Suspensao a ar pode precisar de compressor, cilindro e valvulas. Verifique dependencias antes de prosseguir.",
      });
    }

    if (hasInstalledTerm(["roda", "rodas", "wheel"])) {
      alerts.push({
        severity: "info",
        category: "compatibilidade",
        title: "Rodas e medidas",
        message:
          "Rodas maiores podem exigir ajustes em suspensao, freios e medidas de pneu.",
      });
    }

    if (hasInstalledTerm(["escape"]) && hasInstalledTerm(turboTerms) && !hasInstalledTerm(["escape esportivo", "downpipe"])) {
      alerts.push({
        severity: "warning",
        category: "compatibilidade",
        title: "Escape pode limitar o turbo",
        message:
          "Turbo com escape padrao pode limitar fluxo e aumentar temperatura. Considere validar o conjunto.",
      });
    }

    if (installed.some((part) => matchesAny(part, ["universal"]))) {
      alerts.push({
        severity: "info",
        category: "adaptacao",
        title: "Peca universal",
        message:
          "Peca universal pode precisar de ajuste de medida ou montagem. Verifique compatibilidade com o veiculo.",
      });
    }

    const totalPlanned = planned.reduce((sum, part) => {
      const estimated = Number(part.price_estimate ?? 0);
      return sum + (Number.isFinite(estimated) ? estimated : 0);
    }, 0);
    const totalSpent = expenses.reduce((sum, expense) => {
      const amount = Number(expense.amount ?? 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    if (totalPlanned > 0 && totalSpent > 0) {
      alerts.push({
        severity: "info",
        category: "orcamento",
        title: "Custos futuros mapeados",
        message: `Pecas planejadas somam ${formatCurrency(totalPlanned)} e despesas registradas somam ${formatCurrency(totalSpent)}.`,
      });
    }

    planned.forEach((part) => {
      if (!matchesAny(part, ["dependencia", "dependência"])) return;

      const cost = Number(part.price_estimate ?? 0);
      if (cost <= 0) return;

      alerts.push({
        severity: "warning",
        category: "dependencia",
        title: "Dependencia de peca planejada",
        message:
          "Uma peca planejada possui dependencia que pode impactar custo e sequencia do build.",
        relatedPartId: part.id,
      });
    });
  } catch {
    return [];
  }

  return alerts;
}
