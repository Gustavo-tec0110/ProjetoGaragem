export const MIN_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function pendingPhotoCandidate(path, createdAt, now = Date.now()) {
  const parts = path.split("/");
  if (parts.length !== 3 || !UUID.test(parts[0]) || parts[1] !== "pending-modifications" ||
      !UUID.test(parts[2].replace(/\.webp$/, "")) || !parts[2].endsWith(".webp")) return false;
  const created = Date.parse(createdAt ?? "");
  return Number.isFinite(created) && created <= now - MIN_AGE_MS;
}
