import type {
  CarCommentRow,
  CarPartRow,
  CarPhotoRow,
  CarRow,
  ProfileRow,
} from "@/lib/types";

export type DbId = string;
export type DbProfile = ProfileRow;
export type DbCar = CarRow;
export type DbCarPhoto = CarPhotoRow;
export type DbCarPart = CarPartRow;
export type DbCarComment = CarCommentRow;
