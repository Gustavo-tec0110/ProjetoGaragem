export type ProjectSource = "supabase" | "demo" | "local";

export const PROJECT_STATUS_VALUES = [
  "Planejamento",
  "Em andamento",
  "Quase pronto",
  "Finalizado",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUS_VALUES)[number];

export const PROJECT_EXPENSE_CATEGORIES = [
  "Motor",
  "Suspensão",
  "Rodas",
  "Freios",
  "Estética",
  "Interior",
  "Som",
  "Elétrica",
  "Outros",
] as const;

export type ProjectExpenseCategory = (typeof PROJECT_EXPENSE_CATEGORIES)[number];

export type ProjectSortKey =
  | "relevance"
  | "recent"
  | "popular"
  | "likes"
  | "comments"
  | "views"
  | "updated"
  | "invested"
  | "hot";

export type ProjectPartStatus = "installed" | "planned" | "removed";

export type ProjectPart = {
  id: string;
  name: string;
  category: string;
  brand?: string | null;
  description?: string | null;
  status: ProjectPartStatus;
  priceEstimate: number | null;
  installedAt?: string | null;
  imageUrl?: string | null;
  externalUrl?: string | null;
};

export type ProjectUpdate = {
  id: string;
  title: string;
  description: string;
  photo: string | null;
  photos: string[];
  category: string;
  date: string;
  amount: number | null;
};

export type ProjectExpense = {
  id: string;
  name: string;
  category: ProjectExpenseCategory | string;
  amount: number;
  date: string;
  note?: string | null;
  partName?: string | null;
  isPublic?: boolean;
};

export type ProjectFinanceCategoryTotal = {
  category: string;
  total: number;
};

export type ProjectSeed = {
  id: string;
  slug: string;
  source: ProjectSource;
  databaseId: string | null;
  ownerId: string | null;
  ownerName: string;
  ownerUsername: string | null;
  title: string;
  carModel: string;
  brand: string | null;
  model: string | null;
  year: number;
  engine: string;
  style: string;
  shortDescription: string;
  description: string;
  mainImage: string;
  gallery: string[];
  installedParts: ProjectPart[];
  plannedParts: ProjectPart[];
  removedParts?: ProjectPart[];
  estimatedCost: number | null;
  status?: string | null;
  progressPercent?: number | null;
  likes: number;
  saves: number;
  views: number;
  comments: number;
  followers?: number;
  tags: string[];
  mileageKm?: number | null;
  powerCv?: number | null;
  torqueNm?: number | null;
  weightKg?: number | null;
  startedAt?: string | null;
  projectGoal?: string | null;
  updates?: ProjectUpdate[];
  expenses?: ProjectExpense[];
  financeByCategory?: ProjectFinanceCategoryTotal[];
  totalInvested?: number | null;
  lastUpdateAt?: string | null;
  updatesCount?: number | null;
  modificationsCount?: number | null;
  ownerAvatarUrl?: string | null;
  ownerBio?: string | null;
  ownerInstagram?: string | null;
  city: string | null;
  state: string | null;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  showExpensesPublic?: boolean;
  specConfidencePercent?: number | null;
  currentInduction?: string | null;
  factoryEngine?: string | null;
  factoryInduction?: string | null;
  factoryPowerCv?: number | null;
  factoryTransmission?: string | null;
  factoryDrivetrain?: string | null;
  factorySpecsNote?: string | null;
  viewerHasLiked: boolean;
  viewerHasSaved: boolean;
  viewerHasFollowed?: boolean;
  editHref: string | null;
};

export type Project = ProjectSeed & {
  status: ProjectStatus;
  progressPercent: number;
  mileageKm: number | null;
  powerCv: number | null;
  torqueNm: number | null;
  weightKg: number | null;
  startedAt: string | null;
  projectGoal: string | null;
  removedParts: ProjectPart[];
  updates: ProjectUpdate[];
  expenses: ProjectExpense[];
  financeByCategory: ProjectFinanceCategoryTotal[];
  totalInvested: number | null;
  updatesCount: number;
  modificationsCount: number;
  lastUpdateAt: string | null;
  projectDurationMonths: number | null;
  projectDurationLabel: string;
  ownerAvatarUrl: string | null;
  ownerBio: string | null;
  ownerInstagram: string | null;
  specConfidencePercent: number | null;
  currentInduction: string | null;
  factoryEngine: string | null;
  factoryInduction: string | null;
  factoryPowerCv: number | null;
  factoryTransmission: string | null;
  factoryDrivetrain: string | null;
  factorySpecsNote: string | null;
  viewerHasFollowed: boolean;
  followers: number;
};

export type ProjectRecommendationGroups = {
  similar: Project[];
  sameCreator: Project[];
  sameModel: Project[];
  sameBrand: Project[];
  popular: Project[];
};

export type ProjectFilters = {
  q: string;
  brand: string;
  model: string;
  year: string;
  fuel: string;
  induction: string;
  drivetrain: string;
  category: string;
  style: string;
  engine: string;
  tag?: string;
  sort: ProjectSortKey;
};

export type ProjectCollectionResult = {
  projects: Project[];
  allProjects: Project[];
  availableStyles: string[];
  availableEngines: string[];
  availableBrands: string[];
  availableModels: string[];
  availableYears: string[];
  availableFuels: string[];
  availableInductions: string[];
  availableDrivetrains: string[];
  availableCategories: string[];
  source: "supabase" | "demo";
  notice: string | null;
};
