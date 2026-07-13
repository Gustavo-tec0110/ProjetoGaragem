import type { Project, ProjectPart } from "@/lib/projects/types";
import { normalizeSearchText } from "@/lib/projects/utils";

type InspirationChecklistItem = {
  label: string;
  planned: boolean;
};

export type ProjectInspirationAnalysis = {
  percent: number;
  matchedCriteria: number;
  totalCriteria: number;
  alignedItems: InspirationChecklistItem[];
  missingItems: InspirationChecklistItem[];
};

type Criterion = {
  label: string;
  matched: boolean;
  planned: boolean;
  weight: number;
};

const ENGINE_STOPWORDS = new Set([
  "com",
  "sem",
  "para",
  "and",
  "aspirado",
  "aspirada",
  "projeto",
  "rua",
  "street",
  "build",
  "motor",
]);

function tokens(value: string | null | undefined) {
  return normalizeSearchText(value)
    .split(" ")
    .filter((token) => token.length >= 2 && !ENGINE_STOPWORDS.has(token));
}

function overlapRatio(left: string[], right: string[]) {
  if (!left.length || !right.length) return 0;
  const rightSet = new Set(right);
  const shared = left.filter((token) => rightSet.has(token)).length;
  return shared / Math.max(left.length, right.length);
}

function includesText(haystack: string, needle: string) {
  return needle.length > 0 && haystack.includes(needle);
}

function partCategories(parts: ProjectPart[]) {
  const seen = new Set<string>();
  const labels: Array<{ normalized: string; label: string }> = [];

  for (const part of parts) {
    const normalized = normalizeSearchText(part.category);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    labels.push({ normalized, label: part.category });
  }

  return labels;
}

function normalizedTags(project: Project) {
  return project.tags
    .map((tag) => ({
      normalized: normalizeSearchText(tag.replace(/^#+/, "")),
      label: tag.startsWith("#") ? tag : `#${tag}`,
    }))
    .filter((tag) => tag.normalized);
}

function currentProjectSearch(project: Project) {
  return normalizeSearchText(
    [
      project.title,
      project.carModel,
      project.brand ?? "",
      project.model ?? "",
      project.engine,
      project.style,
      project.projectGoal ?? "",
      ...project.tags,
      ...project.installedParts.map((part) => `${part.category} ${part.name}`),
      ...project.plannedParts.map((part) => `${part.category} ${part.name}`),
    ].join(" ")
  );
}

function buildCriteria(current: Project, reference: Project) {
  const currentText = currentProjectSearch(current);
  const currentInstalledCategories = new Set(
    partCategories(current.installedParts).map((part) => part.normalized)
  );
  const currentPlannedCategories = new Set(
    partCategories(current.plannedParts).map((part) => part.normalized)
  );
  const currentTags = new Set(normalizedTags(current).map((tag) => tag.normalized));
  const criteria: Criterion[] = [];

  if (reference.style) {
    const style = normalizeSearchText(reference.style);
    criteria.push({
      label: `Estilo ${reference.style}`,
      matched:
        includesText(normalizeSearchText(current.style), style) ||
        currentTags.has(style) ||
        includesText(currentText, style),
      planned: false,
      weight: 14,
    });
  }

  if (reference.brand) {
    const brand = normalizeSearchText(reference.brand);
    criteria.push({
      label: `Marca ${reference.brand}`,
      matched:
        includesText(normalizeSearchText(current.brand), brand) ||
        includesText(normalizeSearchText(current.carModel), brand),
      planned: false,
      weight: 8,
    });
  }

  if (reference.model) {
    const model = normalizeSearchText(reference.model);
    criteria.push({
      label: `Modelo ${reference.model}`,
      matched:
        includesText(normalizeSearchText(current.model), model) ||
        includesText(normalizeSearchText(current.carModel), model),
      planned: false,
      weight: 10,
    });
  }

  const engineSimilarity = overlapRatio(tokens(current.engine), tokens(reference.engine));
  if (reference.engine) {
    criteria.push({
      label: `Motor parecido com ${reference.engine}`,
      matched:
        includesText(normalizeSearchText(current.engine), normalizeSearchText(reference.engine)) ||
        engineSimilarity >= 0.35,
      planned: false,
      weight: 14,
    });
  }

  for (const tag of normalizedTags(reference).slice(0, 4)) {
    const matched = currentTags.has(tag.normalized) || includesText(currentText, tag.normalized);
    criteria.push({
      label: `Tag ${tag.label}`,
      matched,
      planned: false,
      weight: 6,
    });
  }

  for (const category of partCategories(reference.installedParts).slice(0, 4)) {
    criteria.push({
      label: `Peca instalada em ${category.label}`,
      matched: currentInstalledCategories.has(category.normalized),
      planned: !currentInstalledCategories.has(category.normalized) &&
        currentPlannedCategories.has(category.normalized),
      weight: 8,
    });
  }

  return criteria;
}

export function analyzeProjectInspiration(
  current: Project | null | undefined,
  reference: Project | null | undefined
): ProjectInspirationAnalysis {
  if (!current || !reference) {
    return {
      percent: 0,
      matchedCriteria: 0,
      totalCriteria: 0,
      alignedItems: [],
      missingItems: [],
    };
  }

  const criteria = buildCriteria(current, reference);
  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  const matchedWeight = criteria.reduce(
    (sum, criterion) => sum + (criterion.matched ? criterion.weight : 0),
    0
  );

  return {
    percent: totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0,
    matchedCriteria: criteria.filter((criterion) => criterion.matched).length,
    totalCriteria: criteria.length,
    alignedItems: criteria
      .filter((criterion) => criterion.matched)
      .map((criterion) => ({ label: criterion.label, planned: false })),
    missingItems: criteria
      .filter((criterion) => !criterion.matched)
      .map((criterion) => ({ label: criterion.label, planned: criterion.planned })),
  };
}
