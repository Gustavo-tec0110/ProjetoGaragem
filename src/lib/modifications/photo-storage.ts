import "server-only";

import { isOwnedModificationPhotoPath, removePhotoIfUnreferenced } from "@/lib/modifications/photo-path";
import { serverLog } from "@/lib/server-log";
import { requireSupabaseUser } from "@/lib/supabase/auth-server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { PROJECT_IMAGES_BUCKET } from "@/lib/supabase/storage";

/** Fail closed if the reference lookup is unavailable. */
export async function removeUnreferencedModificationPhoto(path: string, userId: string, pending: boolean) {
  if (!isOwnedModificationPhotoPath(path, userId, pending)) return false;
  const auth = await requireSupabaseUser();
  if (!auth.supabase || auth.user?.id !== userId) return false;
  const service = getSupabaseServiceRoleClient();
  if (!service) return false;
  return removePhotoIfUnreferenced(path, userId, pending, {
    hasReference: async (target) => {
      // Checks ALL references and atomically prevents future attachment while
      // Storage deletion is in flight; a DB failure never permits deletion.
      const { data, error } = await auth.supabase.rpc("claim_unreferenced_project_image", { p_path: target });
      return error ? null : data !== true;
    },
    remove: async (target) => {
      const removed = await service.storage.from(PROJECT_IMAGES_BUCKET).remove([target]);
      if (removed.error) {
        serverLog.warn("project-modification-photo", { action: "remove.failed", message: removed.error.message });
        return false;
      }
      return true;
    },
  });
}
