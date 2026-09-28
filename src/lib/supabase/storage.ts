import { IMAGE_UPLOAD_MAX_BYTES } from "@/lib/security/limits";

export const PROJECT_IMAGES_BUCKET = "project-images";
export const PROJECT_IMAGE_MAX_BYTES = IMAGE_UPLOAD_MAX_BYTES;
const PROJECT_IMAGE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp"] as const;

type ImageFileDescriptor = Pick<File, "name" | "type">;

export function isAllowedProjectImage(file: Pick<File, "type">) {
  return PROJECT_IMAGE_MIME_TYPES.includes(
    file.type as (typeof PROJECT_IMAGE_MIME_TYPES)[number]
  );
}

function getProjectImageExtension(file: Pick<File, "type">) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export function projectImagePath(userId: string, file: ImageFileDescriptor) {
  const extension = getProjectImageExtension(file);
  const safeName = file.name
    .replace(/\.[^.]+$/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 40);

  return `${userId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName || "imagem"}.${extension}`;
}

export function profileImagePath(userId: string, kind: "avatar" | "cover", file: ImageFileDescriptor) {
  const extension = getProjectImageExtension(file);
  return `${userId}/profile/${kind}-${crypto.randomUUID()}.${extension}`;
}
