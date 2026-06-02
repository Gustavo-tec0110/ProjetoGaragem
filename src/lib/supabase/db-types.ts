import type {
  CarCommentRow,
  CarPartRow,
  CarPhotoRow,
  CarRow,
  Part,
  ProfileRow,
} from "@/lib/types";

export type DbId = string;
export type DbProfile = ProfileRow;
export type DbCar = CarRow;
export type DbPart = Part;
export type DbCarPhoto = CarPhotoRow;
export type DbCarPart = CarPartRow;
export type DbCarComment = CarCommentRow;

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
