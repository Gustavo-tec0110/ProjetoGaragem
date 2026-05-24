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

export interface Part {
  id: string;
  slug: string;
  name: string;
  category: string;
  subcategory?: string;
  brand?: string;
  description?: string;
  price_min?: number;
  price_max?: number;
  compatible_cars?: string[];
  affiliate_url?: string | null;
  affiliate_store?: string | null;
  image_url?: string;
  notes?: string;
  created_at: string;
}
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

/** Supabase typings */
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      cars: {
        Row: {
          id: string;
          slug: string;
          name: string;
          brand: string;
          model: string;
          year_start: number;
          year_end: number;
          engine_options: Json | null;
          power_cv: number | null;
          torque_nm: number | null;
          weight_kg: number | null;
          category: string | null;
          fuel_type: string | null;
          transmission_options: Json | null;
          common_issues: string | null;
          avg_price_min: number | null;
          avg_price_max: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          brand: string;
          model: string;
          year_start: number;
          year_end: number;
          engine_options?: Json;
          power_cv?: number;
          torque_nm?: number;
          weight_kg?: number;
          category?: string;
          fuel_type?: string;
          transmission_options?: Json;
          common_issues?: string;
          avg_price_min?: number;
          avg_price_max?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          brand?: string;
          model?: string;
          year_start?: number;
          year_end?: number;
          engine_options?: Json;
          power_cv?: number;
          torque_nm?: number;
          weight_kg?: number;
          category?: string;
          fuel_type?: string;
          transmission_options?: Json;
          common_issues?: string;
          avg_price_min?: number;
          avg_price_max?: number;
          created_at?: string;
        };
      };
      parts: {
        Row: {
          id: string;
          slug: string;
          name: string;
          category: string;
          subcategory: string | null;
          brand: string | null;
          description: string | null;
          price_min: number | null;
          price_max: number | null;
          compatible_cars: string[] | null;
          affiliate_url: string | null;
          affiliate_store: string | null;
          image_url: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          category: string;
          subcategory?: string;
          brand?: string;
          description?: string;
          price_min?: number;
          price_max?: number;
          compatible_cars?: string[];
          affiliate_url?: string;
          affiliate_store?: string;
          image_url?: string;
          notes?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          category?: string;
          subcategory?: string;
          brand?: string;
          description?: string;
          price_min?: number;
          price_max?: number;
          compatible_cars?: string[];
          affiliate_url?: string;
          affiliate_store?: string;
          image_url?: string;
          notes?: string;
          created_at?: string;
        };
      };
      builds: {
        Row: {
          id: string;
          slug: string;
          title: string;
          user_id: string | null;
          car_id: string | null;
          style: string | null;
          budget_min: number | null;
          budget_max: number | null;
          compatibility_score: number | null;
          parts: Json | null;
          description: string | null;
          is_public: boolean | null;
          likes_count: number | null;
          shares_count: number | null;
          views_count: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          user_id?: string;
          car_id?: string;
          style?: string;
          budget_min?: number;
          budget_max?: number;
          compatibility_score?: number;
          parts?: Json;
          description?: string;
          is_public?: boolean;
          likes_count?: number;
          shares_count?: number;
          views_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          user_id?: string;
          car_id?: string;
          style?: string;
          budget_min?: number;
          budget_max?: number;
          compatibility_score?: number;
          parts?: Json;
          description?: string;
          is_public?: boolean;
          likes_count?: number;
          shares_count?: number;
          views_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          car_count: number | null;
          builds_count: number | null;
          followers_count: number | null;
          following_count: number | null;
          badges: Json | null;
          reputation_score: number | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string;
          avatar_url?: string;
          bio?: string;
          car_count?: number;
          builds_count?: number;
          followers_count?: number;
          following_count?: number;
          badges?: Json;
          reputation_score?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          avatar_url?: string;
          bio?: string;
          car_count?: number;
          builds_count?: number;
          followers_count?: number;
          following_count?: number;
          badges?: Json;
          reputation_score?: number;
          created_at?: string;
        };
      };
      follows: {
        Row: { follower_id: string; following_id: string; created_at: string };
        Insert: { follower_id: string; following_id: string; created_at?: string };
        Update: { follower_id?: string; following_id?: string; created_at?: string };
      };
      likes: {
        Row: { user_id: string; build_id: string; created_at: string };
        Insert: { user_id: string; build_id: string; created_at?: string };
        Update: { user_id?: string; build_id?: string; created_at?: string };
      };
      comments: {
        Row: { id: string; build_id: string; user_id: string; content: string; created_at: string };
        Insert: { id?: string; build_id: string; user_id: string; content: string; created_at?: string };
        Update: { id?: string; build_id?: string; user_id?: string; content?: string; created_at?: string };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
