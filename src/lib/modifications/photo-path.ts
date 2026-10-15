const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function newPendingModificationPhotoPath(userId: string) {
  return `${userId}/pending-modifications/${crypto.randomUUID()}.webp`;
}

export function isOwnedModificationPhotoPath(path: string, userId: string, pending: boolean) {
  if (!UUID.test(userId)) return false;
  const parts = path.split("/");
  const file = parts[2]?.match(/^([0-9a-f-]{36})\.webp$/);
  return parts.length === 3 && parts[0] === userId &&
    parts[1] === (pending ? "pending-modifications" : "modifications") &&
    Boolean(file && UUID.test(file[1]));
}

export function finalizedModificationPhotoPath(path: string, userId: string) {
  if (!isOwnedModificationPhotoPath(path, userId, true)) return null;
  return `${userId}/modifications/${path.split("/")[2]}`;
}

/** The lookup must return null on DB errors, so storage deletion fails closed. */
export async function removePhotoIfUnreferenced(
  path: string,
  userId: string,
  pending: boolean,
  dependencies: {
    hasReference: (path: string) => Promise<boolean | null>;
    remove: (path: string) => Promise<boolean>;
  }
) {
  if (!isOwnedModificationPhotoPath(path, userId, pending)) return false;
  try {
    const referenced = await dependencies.hasReference(path);
    if (referenced !== false) return false;
    return await dependencies.remove(path);
  } catch {
    return false;
  }
}
