export const PROJECT_IMAGES_BUCKET = "project-images";
export const PROJECT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PROJECT_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function isAllowedProjectImage(file: File) {
  return PROJECT_IMAGE_MIME_TYPES.includes(
    file.type as (typeof PROJECT_IMAGE_MIME_TYPES)[number]
  );
}

export function getProjectImageExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export function projectImagePath(userId: string, file: File) {
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
