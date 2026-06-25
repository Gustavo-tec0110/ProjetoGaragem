export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  instagram_handle: string | null;
  is_saves_public: boolean;
  is_likes_public: boolean;
  cars_count: number;
  followers_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
};

export type CarCatalogModelRow = {
  id: string;
  brand: string;
  model: string;
  generation_name: string | null;
  year_start: number;
  year_end: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CarCatalogVersionRow = {
  id: string;
  model_id: string;
  version: string;
  year_start: number;
  year_end: number;
  engine_original: string | null;
  induction_original: string | null;
  power_hp: number | null;
  drivetrain: string | null;
  transmission: string | null;
  fuel_type: string | null;
  notes: string | null;
  is_estimated: boolean;
  created_at: string;
  updated_at: string;
};

export type CarDetailAnswer = "yes" | "no" | "unknown";
export type CarDataConfidence = "confirmed" | "estimated" | "unknown";

export type CarRow = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  version: string | null;
  catalog_version_id: string | null;
  version_confidence: CarDataConfidence;
  factory_spec_confidence: CarDataConfidence;
  factory_specs_note: string | null;
  factory_engine: string | null;
  factory_induction: string | null;
  factory_power_cv: number | null;
  factory_transmission: string | null;
  factory_drivetrain: string | null;
  spec_confidence_percent: number;
  original_engine_answer: CarDetailAnswer;
  original_induction_answer: CarDetailAnswer;
  current_induction: string | null;
  original_color_answer: CarDetailAnswer;
  original_wheels_answer: CarDetailAnswer;
  original_interior_answer: CarDetailAnswer;
  original_suspension_answer: CarDetailAnswer;
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
  show_expenses_public: boolean;
  is_public: boolean;
  likes_count: number;
  saves_count: number;
  comments_count: number;
  views_count: number;
  project_followers_count: number;
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
  storage_path: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
};

export type CarPartStatus = "installed" | "planned" | "removed";

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
  installed_at: string | null;
  image_url: string | null;
  storage_path: string | null;
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
  photo_urls: string[];
  category: string;
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
  note: string | null;
  part_id: string | null;
  part_name: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type ProjectFollowRow = {
  id: string;
  user_id: string;
  car_id: string;
  created_at: string;
};

export type NotificationType =
  | "follow"
  | "project_comment"
  | "project_like"
  | "project_save"
  | "project_follow"
  | "project_update";

export type NotificationRow = {
  id: string;
  user_id: string;
  actor_id: string | null;
  car_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
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
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          city?: string | null;
          state?: string | null;
          instagram_handle?: string | null;
          is_saves_public?: boolean;
          is_likes_public?: boolean;
        }
      >;
      car_catalog_models: Table<
        CarCatalogModelRow,
        {
          id?: string;
          brand: string;
          model: string;
          generation_name?: string | null;
          year_start: number;
          year_end: number;
          notes?: string | null;
        }
      >;
      car_catalog_versions: Table<
        CarCatalogVersionRow,
        {
          id?: string;
          model_id: string;
          version: string;
          year_start: number;
          year_end: number;
          engine_original?: string | null;
          induction_original?: string | null;
          power_hp?: number | null;
          drivetrain?: string | null;
          transmission?: string | null;
          fuel_type?: string | null;
          notes?: string | null;
          is_estimated?: boolean;
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
          catalog_version_id?: string | null;
          version_confidence?: CarDataConfidence;
          factory_spec_confidence?: CarDataConfidence;
          factory_specs_note?: string | null;
          factory_engine?: string | null;
          factory_induction?: string | null;
          factory_power_cv?: number | null;
          factory_transmission?: string | null;
          factory_drivetrain?: string | null;
          spec_confidence_percent?: number;
          original_engine_answer?: CarDetailAnswer;
          original_induction_answer?: CarDetailAnswer;
          current_induction?: string | null;
          original_color_answer?: CarDetailAnswer;
          original_wheels_answer?: CarDetailAnswer;
          original_interior_answer?: CarDetailAnswer;
          original_suspension_answer?: CarDetailAnswer;
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
          show_expenses_public?: boolean;
          is_public?: boolean;
          project_followers_count?: number;
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
          storage_path?: string | null;
          width?: number | null;
          height?: number | null;
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
          installed_at?: string | null;
          image_url?: string | null;
          storage_path?: string | null;
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
          photo_urls?: string[];
          category?: string;
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
          note?: string | null;
          part_id?: string | null;
          part_name?: string | null;
          is_public?: boolean;
        }
      >;
      user_follows: Table<{
        follower_id: string;
        following_id: string;
        created_at: string;
      }>;
      project_follows: Table<
        ProjectFollowRow,
        {
          id?: string;
          user_id: string;
          car_id: string;
        }
      >;
      notifications: Table<
        NotificationRow,
        {
          id?: string;
          user_id: string;
          actor_id?: string | null;
          car_id?: string | null;
          type: NotificationType;
          title: string;
          body?: string | null;
          read_at?: string | null;
        },
        {
          read_at?: string | null;
        }
      >;
      part_requirements: Table<{
        id: string;
        part_category: string;
        required_category: string;
        message: string;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      increment_car_view: {
        Args: { target_car_id: string };
        Returns: number;
      };
      create_notification: {
        Args: {
          recipient_id: string;
          notification_type: NotificationType;
          car_id?: string | null;
          notification_title?: string | null;
          notification_body?: string | null;
          dedupe?: boolean;
        };
        Returns: string | null;
      };
    };
    Enums: Record<string, never>;
  };
}
