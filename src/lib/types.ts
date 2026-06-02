export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
  | "Suspensao"
  | "Escape"
  | "Intake"
  | "Multimidia"
  | "Bodykit"
  | "Iluminacao"
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

export interface LegacyCar {
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
  subcategory?: string | null;
  brand?: string | null;
  description?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  compatible_cars?: string[] | null;
  affiliate_url?: string | null;
  affiliate_store?: string | null;
  image_url?: string | null;
  notes?: string | null;
  created_at: string;
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

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  instagram_handle: string | null;
  is_saves_public: boolean;
  cars_count: number;
  followers_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
};

export type CarRow = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  version: string | null;
  category: string;
  state: string | null;
  city: string | null;
  description: string | null;
  main_photo_url: string | null;
  photo_urls: string[];
  engine: string | null;
  power_cv: number | null;
  fuel_type: string | null;
  transmission: string | null;
  drivetrain: string | null;
  suspension: string | null;
  wheels: string | null;
  tires: string | null;
  brakes: string | null;
  project_status: string | null;
  progress_percent: number | null;
  mileage_km: number | null;
  torque_nm: number | null;
  weight_kg: number | null;
  started_at: string | null;
  project_goal: string | null;
  tags: string[] | null;
  is_public: boolean;
  likes_count: number;
  saves_count: number;
  comments_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  year_start?: number | null;
  year_end?: number | null;
  engine_options?: Json | null;
  transmission_options?: Json | null;
  common_issues?: string[] | null;
  avg_price_min?: number | null;
  avg_price_max?: number | null;
};

export type CarPhotoRow = {
  id: string;
  car_id: string;
  url: string;
  alt: string | null;
  sort_order: number;
  created_at: string;
};

export type CarPartStatus = "installed" | "planned";

export type CarPartRow = {
  id: string;
  car_id: string;
  name: string;
  category: string;
  brand: string | null;
  description: string | null;
  status: CarPartStatus;
  priority: string | null;
  price_estimate: number | null;
  external_url: string | null;
  affiliate_url: string | null;
  store_name: string | null;
  product_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CarCommentRow = {
  id: string;
  car_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export type CarBuildUpdateRow = {
  id: string;
  car_id: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  happened_at: string;
  amount_spent: number | null;
  created_at: string;
  updated_at: string;
};

export type CarExpenseRow = {
  id: string;
  car_id: string;
  name: string;
  category: string;
  amount: number;
  spent_at: string;
  created_at: string;
  updated_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        ProfileRow,
        {
          id: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          bio?: string | null;
          city?: string | null;
          state?: string | null;
          instagram_handle?: string | null;
          is_saves_public?: boolean;
        }
      >;
      cars: Table<
        CarRow,
        {
          id?: string;
          owner_id: string;
          slug: string;
          name: string;
          brand: string;
          model: string;
          year: number;
          version?: string | null;
          category: string;
          state?: string | null;
          city?: string | null;
          description?: string | null;
          main_photo_url?: string | null;
          photo_urls?: string[];
          engine?: string | null;
          power_cv?: number | null;
          fuel_type?: string | null;
          transmission?: string | null;
          drivetrain?: string | null;
          suspension?: string | null;
          wheels?: string | null;
          tires?: string | null;
          brakes?: string | null;
          project_status?: string | null;
          progress_percent?: number | null;
          mileage_km?: number | null;
          torque_nm?: number | null;
          weight_kg?: number | null;
          started_at?: string | null;
          project_goal?: string | null;
          tags?: string[] | null;
          is_public?: boolean;
        }
      >;
      car_photos: Table<
        CarPhotoRow,
        {
          id?: string;
          car_id: string;
          url: string;
          alt?: string | null;
          sort_order?: number;
        }
      >;
      car_parts: Table<
        CarPartRow,
        {
          id?: string;
          car_id: string;
          name: string;
          category: string;
          brand?: string | null;
          description?: string | null;
          status: CarPartStatus;
          priority?: string | null;
          price_estimate?: number | null;
          external_url?: string | null;
          affiliate_url?: string | null;
          store_name?: string | null;
          product_id?: string | null;
        }
      >;
      car_likes: Table<{
        car_id: string;
        user_id: string;
        created_at: string;
      }>;
      car_saves: Table<{
        car_id: string;
        user_id: string;
        created_at: string;
      }>;
      car_comments: Table<
        CarCommentRow,
        { id?: string; car_id: string; user_id: string; content: string }
      >;
      car_build_updates: Table<
        CarBuildUpdateRow,
        {
          id?: string;
          car_id: string;
          title: string;
          description?: string | null;
          photo_url?: string | null;
          happened_at: string;
          amount_spent?: number | null;
        }
      >;
      car_expenses: Table<
        CarExpenseRow,
        {
          id?: string;
          car_id: string;
          name: string;
          category: string;
          amount: number;
          spent_at: string;
        }
      >;
      user_follows: Table<{
        follower_id: string;
        following_id: string;
        created_at: string;
      }>;
      part_requirements: Table<{
        id: string;
        part_category: string;
        required_category: string;
        message: string;
        created_at: string;
      }>;
      parts: Table<Part>;
      builds: Table<{
        id: string;
        slug: string;
        title: string;
        user_id: string;
        car_id: string;
        style: string;
        budget_min: number | null;
        budget_max: number | null;
        compatibility_score: number;
        parts: Json | null;
        description: string | null;
        car_photo_url: string | null;
        is_public: boolean;
        likes_count: number;
        shares_count: number;
        views_count: number;
        created_at: string;
        updated_at: string;
      }>;
      likes: Table<{ user_id: string; build_id: string; created_at: string }>;
      comments: Table<{
        id: string;
        build_id: string;
        user_id: string;
        content: string;
        created_at: string;
      }>;
      follows: Table<{
        follower_id: string;
        following_id: string;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      weekly_build_ranking: {
        Args: { limit_count?: number };
        Returns: Array<{ build_id: string; likes_week: number }>;
      };
    };
    Enums: Record<string, never>;
  };
}
