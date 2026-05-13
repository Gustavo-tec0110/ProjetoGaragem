export type StyleId =
  | "jdm"
  | "sleeper"
  | "corrida"
  | "rebaixado"
  | "som"
  | "drift"
  | "rally"
  | "oemplus"
  | "luxo"
  | "turbostreet";

export type CarId =
  | "civic-g8"
  | "gol-g5"
  | "golf-mk7"
  | "hb20"
  | "onix"
  | "corolla";

export type BuildPartCategory =
  | "Rodas"
  | "Suspensão"
  | "Escape"
  | "Intake"
  | "Multimídia"
  | "Bodykit"
  | "Iluminação"
  | "Som";

export type CompatibilityStatus =
  | "plug_and_play"
  | "compatible"
  | "requires_adaptation"
  | "incompatible";

export interface CompatibilityResult {
  status: CompatibilityStatus;
  score: number;
  reasons: string[];
}

export interface BuildImpact {
  suspension: number;
  wheel: number;
  engine: number;
  aesthetics: number;
  comfort: number;
  dailyUse: number;
}

export interface BuildAlert {
  id: string;
  status: Extract<CompatibilityStatus, "requires_adaptation" | "incompatible">;
  message: string;
  relatedCategories: BuildPartCategory[];
}

export interface Style {
  id: StyleId;
  label: string;
  badge: string;
  tagline: string;
  backdrop: string;
}

export interface Car {
  id: CarId;
  name: string;
  segment: string;
  power: string;
  fuelConsumption: string;
  commonIssues: string;
  avgProjectCost: string;
  wheelClearance: {
    maxInches: number;
    minOffset: number;
  };
}

export interface BuildPart {
  category: BuildPartCategory;
  name: string;
  priceRange: string;
  compatibility: CompatibilityResult;
  impact: BuildImpact;
}

export interface Build {
  id: string;
  carId: CarId;
  styleId: StyleId;
  budget: number;
  compatibilityScore: number;
  balanceScore: number;
  alerts: BuildAlert[];
  parts: BuildPart[];
}
