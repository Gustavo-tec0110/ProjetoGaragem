import {
  PROJECT_EXPENSE_CATEGORIES,
  PROJECT_STATUS_VALUES,
  type Project,
  type ProjectExpense,
  type ProjectFilters,
  type ProjectFinanceCategoryTotal,
  type ProjectSeed,
  type ProjectSortKey,
  type ProjectStatus,
  type ProjectUpdate,
} from "@/lib/projects/types";

export const PROJECT_IMAGE_FALLBACK = "/ref/hero-car.jpg";
export const PROJECTS_PER_PAGE = 9;

export function buildProjectHref(slug: string) {
  return `/projeto/${slug}`;
}

export function buildLegacyProjectHref(slug: string) {
  return `/carros/${slug}`;
}

export function buildSearchHref(query: string) {
  const params = new URLSearchParams();
  params.set("q", query);
  return `/explorar?${params.toString()}`;
}

export function buildCompareHref(leftSlug?: string | null, rightSlug?: string | null) {
  const params = new URLSearchParams();
  if (leftSlug) params.set("left", leftSlug);
  if (rightSlug) params.set("right", rightSlug);
  const query = params.toString();
  return query ? `/comparar?${query}` : "/comparar";
}

export function formatProjectCurrency(value: number | null | undefined) {
  if (!value || value <= 0) return "Não informado";
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

export function formatNumber(value: number | null | undefined, suffix = "") {
  if (value == null) return "Não informado";
  return `${value.toLocaleString("pt-BR")}${suffix}`;
}

export function formatProjectDate(value: string | null | undefined) {
  if (!value) return "Não informado";
  return new Date(value).toLocaleDateString("pt-BR");
}

export function normalizeProjectStatus(value: string | null | undefined): ProjectStatus {
  if (!value) return "Em andamento";

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (normalized.includes("planej")) return "Planejamento";
  if (normalized.includes("quase")) return "Quase pronto";
  if (normalized.includes("final")) return "Finalizado";
  if (
    normalized.includes("andamento") ||
    normalized.includes("evolu") ||
    normalized.includes("ativo") ||
    normalized.includes("acerto")
  ) {
    return "Em andamento";
  }

  return PROJECT_STATUS_VALUES.includes(value as ProjectStatus)
    ? (value as ProjectStatus)
    : "Em andamento";
}

export function statusToProgress(status: ProjectStatus) {
  switch (status) {
    case "Planejamento":
      return 12;
    case "Em andamento":
      return 48;
    case "Quase pronto":
      return 82;
    case "Finalizado":
      return 100;
    default:
      return 48;
  }
}

export function clampProgress(value: number | null | undefined, fallbackStatus: ProjectStatus) {
  if (value == null || Number.isNaN(value)) return statusToProgress(fallbackStatus);
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function normalizeProjectTag(tag: string) {
  const sanitized = tag
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, "")
    .toLowerCase();

  return sanitized ? `#${sanitized}` : "";
}

export function parseTagString(value: string) {
  return uniqueStrings(
    value
      .split(/[\n,;]+/g)
      .map((tag) => normalizeProjectTag(tag))
      .filter(Boolean)
  );
}

export function normalizeProjectFilters(filters?: Partial<ProjectFilters>): ProjectFilters {
  const sort = filters?.sort;
  return {
    q: filters?.q?.trim() ?? "",
    style: filters?.style?.trim() ?? "",
    engine: filters?.engine?.trim() ?? "",
    tag: filters?.tag?.trim() ?? "",
    sort:
      sort === "likes" ||
      sort === "views" ||
      sort === "recent" ||
      sort === "updated" ||
      sort === "invested" ||
      sort === "hot"
        ? sort
        : "recent",
  };
}

export function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[+]/g, " plus ")
    .replace(/#/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

export function sumProjectExpenses(expenses: ProjectExpense[]) {
  return expenses.reduce((sum, expense) => sum + Math.max(0, expense.amount), 0);
}

export function groupExpensesByCategory(expenses: ProjectExpense[]): ProjectFinanceCategoryTotal[] {
  const map = new Map<string, number>();

  for (const expense of expenses) {
    const category = expense.category || "Outros";
    map.set(category, (map.get(category) ?? 0) + Math.max(0, expense.amount));
  }

  const order = new Map<string, number>(
    PROJECT_EXPENSE_CATEGORIES.map((category, index) => [category, index])
  );

  return Array.from(map.entries())
    .map(([category, total]) => ({ category, total }))
    .sort(
      (left, right) =>
        right.total - left.total ||
        (order.get(left.category) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(right.category) ?? Number.MAX_SAFE_INTEGER) ||
        left.category.localeCompare(right.category, "pt-BR")
    );
}

export function getProjectDuration(startedAt: string | null | undefined, fallbackDate: string) {
  if (!startedAt) {
    return {
      months: null,
      label: "Não informado",
    };
  }

  const start = new Date(startedAt);
  const end = new Date(fallbackDate);
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    (end.getDate() >= start.getDate() ? 0 : -1);

  if (months <= 0) {
    return { months: 0, label: "Menos de 1 mes" };
  }
  if (months === 1) {
    return { months, label: "1 mes" };
  }
  if (months < 12) {
    return { months, label: `${months} meses` };
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (!remainingMonths) {
    return { months, label: years === 1 ? "1 ano" : `${years} anos` };
  }

  return {
    months,
    label: `${years}a ${remainingMonths}m`,
  };
}

export function sortProjectUpdates(updates: ProjectUpdate[]) {
  return [...updates].sort(
    (left, right) =>
      new Date(right.date).getTime() - new Date(left.date).getTime() ||
      right.title.localeCompare(left.title, "pt-BR")
  );
}

export function sortProjectExpenses(expenses: ProjectExpense[]) {
  return [...expenses].sort(
    (left, right) =>
      new Date(right.date).getTime() - new Date(left.date).getTime() ||
      right.amount - left.amount
  );
}

export function getProjectTotalInvested(project: Pick<Project, "totalInvested" | "estimatedCost">) {
  return project.totalInvested ?? project.estimatedCost;
}

function projectHotScore(project: Project) {
  const recencyDays = Math.max(
    0,
    (Date.now() - new Date(project.lastUpdateAt ?? project.updatedAt).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const freshness = Math.max(0, 30 - recencyDays);
  return project.likes * 4 + project.views * 0.12 + freshness * 10 + project.comments * 2;
}

const PROJECT_THEME_ALIASES = [
  {
    match: ["jdm", "vtec", "honda", "toyota", "nissan", "subaru", "mitsubishi", "mazda", "lexus"],
    aliases: ["jdm", "japanese", "japones", "vtec"],
  },
  {
    match: ["off road", "offroad", "4x4", "trilha", "overland"],
    aliases: ["off road", "offroad", "4x4", "trilha", "overland"],
  },
  {
    match: ["turbo", "boost", "pressurizado"],
    aliases: ["turbo", "boost", "pressurizado"],
  },
  {
    match: ["stance", "fitment", "rebaixado", "baixo", "airride", "ar"],
    aliases: ["stance", "fitment", "rebaixado", "baixo", "airride"],
  },
  {
    match: ["track", "track day", "pista", "time attack", "autodromo"],
    aliases: ["track", "track day", "pista", "time attack", "autodromo"],
  },
  {
    match: ["sleeper", "discreto", "oem plus", "oem", "original", "clean"],
    aliases: ["sleeper", "discreto", "oem plus", "oemplus", "original", "clean"],
  },
  {
    match: ["classico", "classicos", "restomod", "antigo", "aircooled", "vintage"],
    aliases: ["classico", "classicos", "restomod", "antigo", "aircooled", "vintage"],
  },
] as const;

function getProjectSearchText(project: Project) {
  const baseTerms = [
    project.title,
    project.carModel,
    project.brand ?? "",
    project.model ?? "",
    project.ownerName,
    project.engine,
    project.style,
    project.shortDescription,
    project.description,
    project.projectGoal ?? "",
    ...project.tags,
  ];

  const baseText = normalizeSearchText(baseTerms.join(" "));
  const aliasTerms = PROJECT_THEME_ALIASES.flatMap((rule) =>
    rule.match.some((term) => baseText.includes(normalizeSearchText(term))) ? rule.aliases : []
  );

  return normalizeSearchText([...baseTerms, ...aliasTerms].join(" "));
}

export function projectMatchesTheme(project: Project, terms: string[]) {
  const haystack = getProjectSearchText(project);
  return terms.some((term) => haystack.includes(normalizeSearchText(term)));
}

export function getProjectEngagementScore(project: Project) {
  return Math.round(projectHotScore(project));
}

export function enrichProject(project: ProjectSeed): Project {
  const normalizedStatus = normalizeProjectStatus(project.status);
  const rawTags = Array.isArray(project.tags) ? project.tags : [];
  const normalizedTags = uniqueStrings(rawTags.map((tag) => normalizeProjectTag(tag) || tag));
  const updates = sortProjectUpdates(project.updates ?? []);
  const expenses = sortProjectExpenses(
    (project.expenses ?? []).map((expense) => ({
      ...expense,
      amount: Math.max(0, expense.amount),
    }))
  );
  const financeByCategory =
    project.financeByCategory && project.financeByCategory.length
      ? [...project.financeByCategory].sort((left, right) => right.total - left.total)
      : groupExpensesByCategory(expenses);
  const computedInvested = expenses.length
    ? sumProjectExpenses(expenses)
    : project.totalInvested ?? project.estimatedCost;
  const duration = getProjectDuration(project.startedAt, project.updatedAt);

  return {
    ...project,
    status: normalizedStatus,
    progressPercent: clampProgress(project.progressPercent, normalizedStatus),
    mileageKm: project.mileageKm ?? null,
    powerCv: project.powerCv ?? null,
    torqueNm: project.torqueNm ?? null,
    weightKg: project.weightKg ?? null,
    startedAt: project.startedAt ?? null,
    projectGoal: project.projectGoal?.trim() || null,
    removedParts: project.removedParts ?? [],
    updates,
    expenses,
    financeByCategory,
    totalInvested: computedInvested ?? null,
    followers: project.followers ?? 0,
    updatesCount: project.updatesCount ?? updates.length,
    modificationsCount:
      project.modificationsCount ??
      project.installedParts.length + project.plannedParts.length,
    lastUpdateAt: project.lastUpdateAt ?? updates[0]?.date ?? project.updatedAt,
    projectDurationMonths: duration.months,
    projectDurationLabel: duration.label,
    ownerAvatarUrl: project.ownerAvatarUrl ?? null,
    ownerBio: project.ownerBio ?? null,
    ownerInstagram: project.ownerInstagram ?? null,
    specConfidencePercent: project.specConfidencePercent ?? null,
    currentInduction: project.currentInduction ?? null,
    factoryEngine: project.factoryEngine ?? null,
    factoryInduction: project.factoryInduction ?? null,
    factoryPowerCv: project.factoryPowerCv ?? null,
    factoryTransmission: project.factoryTransmission ?? null,
    factoryDrivetrain: project.factoryDrivetrain ?? null,
    factorySpecsNote: project.factorySpecsNote ?? null,
    viewerHasFollowed: project.viewerHasFollowed ?? false,
    tags: normalizedTags,
  };
}

export function uniqueProjects(projects: Project[]) {
  const map = new Map<string, Project>();
  for (const project of projects) {
    map.set(project.slug, project);
  }
  return Array.from(map.values());
}

export function filterProjects(projects: Project[], filters: ProjectFilters) {
  const searchTerm = normalizeSearchText(filters.q);
  const styleTerm = normalizeSearchText(filters.style);
  const engineTerm = normalizeSearchText(filters.engine);
  const tagTerm = normalizeSearchText(filters.tag ?? "");

  return projects.filter((project) => {
    const searchText = getProjectSearchText(project);
    const matchesSearch = !searchTerm || searchText.includes(searchTerm);
    const matchesStyle =
      !styleTerm ||
      normalizeSearchText(project.style) === styleTerm ||
      projectMatchesTheme(project, [styleTerm]);
    const matchesEngine = !engineTerm || normalizeSearchText(project.engine).includes(engineTerm);
    const matchesTag =
      !tagTerm ||
      project.tags.some((tag) => normalizeSearchText(tag).includes(tagTerm)) ||
      projectMatchesTheme(project, [tagTerm]);

    return matchesSearch && matchesStyle && matchesEngine && matchesTag;
  });
}

export function sortProjects(projects: Project[], sort: ProjectSortKey) {
  const cloned = [...projects];

  cloned.sort((left, right) => {
    if (sort === "likes") {
      if (right.likes !== left.likes) return right.likes - left.likes;
    } else if (sort === "views") {
      if (right.views !== left.views) return right.views - left.views;
    } else if (sort === "updated") {
      if (new Date(right.lastUpdateAt ?? right.updatedAt).getTime() !== new Date(left.lastUpdateAt ?? left.updatedAt).getTime()) {
        return (
          new Date(right.lastUpdateAt ?? right.updatedAt).getTime() -
          new Date(left.lastUpdateAt ?? left.updatedAt).getTime()
        );
      }
    } else if (sort === "invested") {
      const rightInvested = getProjectTotalInvested(right) ?? 0;
      const leftInvested = getProjectTotalInvested(left) ?? 0;
      if (rightInvested !== leftInvested) return rightInvested - leftInvested;
    } else if (sort === "hot") {
      const rightScore = getProjectEngagementScore(right);
      const leftScore = getProjectEngagementScore(left);
      if (rightScore !== leftScore) return rightScore - leftScore;
    } else if (new Date(right.createdAt).getTime() !== new Date(left.createdAt).getTime()) {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    }

    return right.likes - left.likes || right.views - left.views;
  });

  return cloned;
}

export function getAvailableStyles(projects: Project[]) {
  return uniqueStrings(projects.map((project) => project.style)).sort((left, right) =>
    left.localeCompare(right, "pt-BR")
  );
}

export function getAvailableEngines(projects: Project[]) {
  return uniqueStrings(projects.map((project) => project.engine)).sort((left, right) =>
    left.localeCompare(right, "pt-BR")
  );
}

export function createShortDescription(description: string, fallback: string) {
  const text = description.trim() || fallback.trim();
  if (text.length <= 140) return text;
  return `${text.slice(0, 137).trimEnd()}...`;
}

export function getSimilarProjects(projects: Project[], currentProject: Project, limit = 3) {
  return projects
    .filter((project) => project.slug !== currentProject.slug)
    .map((project) => {
      let score = 0;
      if (project.style === currentProject.style) score += 4;
      if (project.brand && currentProject.brand && project.brand === currentProject.brand) score += 3;
      if (project.engine === currentProject.engine) score += 2;
      if (project.tags.some((tag) => currentProject.tags.includes(tag))) score += 1;
      return { project, score };
    })
    .sort((left, right) => right.score - left.score || right.project.likes - left.project.likes)
    .slice(0, limit)
    .map((entry) => entry.project);
}

export function paginateProjects(projects: Project[], page: number, pageSize = PROJECTS_PER_PAGE) {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const totalPages = Math.max(1, Math.ceil(projects.length / pageSize));
  const currentPage = Math.min(safePage, totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    page: currentPage,
    pageSize,
    totalPages,
    totalItems: projects.length,
    items: projects.slice(start, start + pageSize),
  };
}

export function getTrendingProjects(projects: Project[], limit = 6) {
  return [...projects]
    .sort((left, right) => getProjectEngagementScore(right) - getProjectEngagementScore(left))
    .slice(0, limit);
}
