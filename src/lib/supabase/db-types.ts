export type DbId = string;

export type DbCar = {
  id: DbId;
  slug: string;
  name: string;
  brand: string;
  model: string;
  year_start: number;
  year_end: number | null;
  engine_options: unknown;
  power_cv: number | null;
  torque_nm: number | null;
  weight_kg: number | null;
  category: string | null;
  fuel_type: string | null;
  transmission_options: unknown;
  common_issues: string[];
  avg_price_min: number | null;
  avg_price_max: number | null;
  created_at: string;
};

export type DbPart = {
  id: DbId;
  slug: string;
  name: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  description: string | null;
  price_min: number | null;
  price_max: number | null;
  compatible_cars: string[];
  affiliate_url: string | null;
  affiliate_store: string | null;
  image_url: string | null;
  notes: string | null;
  created_at: string;
};

export type DbProfile = {
  id: DbId;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  car_count: number;
  builds_count: number;
  followers_count: number;
  following_count: number;
  badges: unknown;
  reputation_score: number;
  garage_car_slugs: string[];
  created_at: string;
};

export type DbBuild = {
  id: DbId;
  slug: string;
  title: string;
  user_id: DbId;
  car_id: DbId;
  style: string;
  budget_min: number | null;
  budget_max: number | null;
  compatibility_score: number;
  parts: unknown;
  description: string | null;
  car_photo_url: string | null;
  is_public: boolean;
  likes_count: number;
  shares_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
};

