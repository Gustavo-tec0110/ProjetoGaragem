"use server";

import { revalidatePath } from "next/cache";

import { serverLog } from "@/lib/server-log";
import { finalizedModificationPhotoPath, isOwnedModificationPhotoPath } from "@/lib/modifications/photo-path";
import { removeUnreferencedModificationPhoto } from "@/lib/modifications/photo-storage";
import { PROJECT_IMAGES_BUCKET } from "@/lib/supabase/storage";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { requireSupabaseUser } from "@/lib/supabase/auth-server";
import type { ServerSupabaseClient } from "@/lib/supabase/auth-server";
import type { ProjectModificationStatus } from "@/lib/types";
import { projectImageUrl } from "@/lib/images/project-image-url";

const STATUSES = new Set<ProjectModificationStatus>(["installed", "planned", "wishlist", "removed"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ModificationDraftInput = {
  catalogId: string;
  status: ProjectModificationStatus;
  paidAmount: number | null;
  note: string;
  publicDescription: string;
  showPaidAmount: boolean;
  photoPath: string | null;
};

type ActionResult = { ok: boolean; message: string };

function validateDraft(input: ModificationDraftInput, userId: string) {
  if (!input || typeof input !== "object" || typeof input.note !== "string" ||
      (input.publicDescription != null && typeof input.publicDescription !== "string")) {
    return { error: "Dados da modificação inválidos." } as const;
  }
  if (!UUID.test(input.catalogId) || !STATUSES.has(input.status)) {
    return { error: "A modificação ou o status informado é inválido." } as const;
  }
  if (
    input.paidAmount !== null &&
    (!Number.isSafeInteger(input.paidAmount) || input.paidAmount < 0 || input.paidAmount > 100_000_000)
  ) {
    return { error: "Informe um valor válido." } as const;
  }
  const note = input.note.trim();
  if (note.length > 1000) return { error: "A observação pode ter no máximo 1.000 caracteres." } as const;
  const publicDescription = typeof input.publicDescription === "string" ? input.publicDescription.trim() : "";
  if (publicDescription.length > 1000) return { error: "A descrição pública pode ter no máximo 1.000 caracteres." } as const;
  if (input.showPaidAmount != null && typeof input.showPaidAmount !== "boolean") return { error: "Visibilidade do valor inválida." } as const;

  const photoPath = input.photoPath?.trim() || null;
  if (photoPath && !isOwnedModificationPhotoPath(photoPath, userId, false) &&
    !isOwnedModificationPhotoPath(photoPath, userId, true)) {
    return { error: "A foto enviada não é válida para esta conta." } as const;
  }

  return { note: note || null, publicDescription: publicDescription || null, photoPath } as const;
}

function modificationPhotoUrl(path: string | null) {
  if (!path) return null;
  const storage = getSupabaseServiceRoleClient();
  if (!storage) return null;
  return projectImageUrl(path);
}

async function finalizePhoto(path: string | null, userId: string, supabase: ServerSupabaseClient) {
  if (!path) return { path: null, error: false };
  if (!isOwnedModificationPhotoPath(path, userId, true)) return { path, error: false };
  const { data: renewed, error: leaseError } = await supabase.rpc("touch_pending_modification_photo", { p_path: path });
  if (leaseError || renewed !== true) return { path: null, error: true };
  const destination = finalizedModificationPhotoPath(path, userId);
  const storage = getSupabaseServiceRoleClient();
  if (!storage || !destination) return { path: null, error: true };
  const { error } = await storage.storage.from(PROJECT_IMAGES_BUCKET).move(path, destination);
  if (error) {
    serverLog.warn("project-modification-photo", { action: "move.failed", message: error.message });
    return { path: null, error: true };
  }
  return { path: destination, error: false };
}

async function cleanupMovedPhoto(originalPath: string | null, finalPath: string | null, userId: string) {
  if (originalPath && finalPath && isOwnedModificationPhotoPath(originalPath, userId, true)) {
    await removeUnreferencedModificationPhoto(finalPath, userId, false);
  }
}

async function getOwnedCar(carId: string) {
  const auth = await requireSupabaseUser();
  if (!auth.supabase || !auth.user) return { error: auth.error ?? "Entre para continuar." } as const;
  if (!UUID.test(carId)) return { error: "Projeto inválido." } as const;

  const { data: car, error } = await auth.supabase
    .from("cars")
    .select("id, slug, owner_id")
    .eq("id", carId)
    .maybeSingle();
  if (error || !car || car.owner_id !== auth.user.id) {
    return { error: "Você não tem permissão para alterar este projeto." } as const;
  }
  return { auth, car } as const;
}

function refreshModificationPage(slug: string) {
  revalidatePath(`/projeto/${slug}/modificacoes`);
  revalidatePath(`/projeto/${slug}`);
}

export async function createProjectModification(carId: string, input: ModificationDraftInput): Promise<ActionResult> {
  const owned = await getOwnedCar(carId);
  if ("error" in owned) return { ok: false, message: owned.error ?? "Entre para continuar." };

  const draft = validateDraft(input, owned.auth.user.id);
  if ("error" in draft) return { ok: false, message: draft.error ?? "Dados inválidos." };
  if (draft.photoPath && !isOwnedModificationPhotoPath(draft.photoPath, owned.auth.user.id, true)) {
    return { ok: false, message: "Envie uma nova foto para esta modificação." };
  }
  const { data: catalogItem } = await owned.auth.supabase
    .from("modification_catalog")
    .select("id")
    .eq("id", input.catalogId)
    .eq("is_active", true)
    .maybeSingle();
  if (!catalogItem) return { ok: false, message: "Esta modificação não está disponível no catálogo." };

  const finalized = await finalizePhoto(draft.photoPath, owned.auth.user.id, owned.auth.supabase);
  if (finalized.error) return { ok: false, message: "Não foi possível preparar a foto agora." };
  const projectPhotoUrl = modificationPhotoUrl(finalized.path);
  if (draft.photoPath && !projectPhotoUrl) {
    await cleanupMovedPhoto(draft.photoPath, finalized.path, owned.auth.user.id);
    return { ok: false, message: "O serviço de fotos está indisponível agora." };
  }
  let saveFailed: boolean;
  try {
    const { data, error } = await owned.auth.supabase.from("project_modifications").insert({
      car_id: carId,
      catalog_id: input.catalogId,
      status: input.status,
      paid_amount: input.paidAmount,
      note: draft.note,
      public_description: draft.publicDescription,
      show_paid_amount: input.showPaidAmount === true,
      project_photo_storage_path: finalized.path,
      project_photo_url: projectPhotoUrl,
    }).select("id").maybeSingle();
    saveFailed = Boolean(error || !data);
  } catch (error) {
    serverLog.warn("project-modification-photo", { action: "insert.failed", message: error instanceof Error ? error.message : "unknown" });
    saveFailed = true;
  }
  if (saveFailed) {
    await cleanupMovedPhoto(draft.photoPath, finalized.path, owned.auth.user.id);
    return { ok: false, message: "Não foi possível salvar a modificação agora." };
  }

  refreshModificationPage(owned.car.slug);
  return { ok: true, message: "Modificação adicionada ao projeto." };
}

export async function updateProjectModification(
  carId: string,
  modificationId: string,
  input: ModificationDraftInput
): Promise<ActionResult> {
  const owned = await getOwnedCar(carId);
  if ("error" in owned) return { ok: false, message: owned.error ?? "Entre para continuar." };
  if (!UUID.test(modificationId)) return { ok: false, message: "Modificação inválida." };

  const draft = validateDraft(input, owned.auth.user.id);
  if ("error" in draft) return { ok: false, message: draft.error ?? "Dados inválidos." };
  const [{ data: current }, { data: catalogItem }] = await Promise.all([
    owned.auth.supabase
      .from("project_modifications")
      .select("id, project_photo_storage_path")
      .eq("id", modificationId)
      .eq("car_id", carId)
      .maybeSingle(),
    owned.auth.supabase
      .from("modification_catalog")
      .select("id")
      .eq("id", input.catalogId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);
  if (!current) return { ok: false, message: "Modificação não encontrada." };
  if (!catalogItem) return { ok: false, message: "Esta modificação não está disponível no catálogo." };
  if (draft.photoPath && draft.photoPath !== current.project_photo_storage_path &&
    !isOwnedModificationPhotoPath(draft.photoPath, owned.auth.user.id, true)) {
    return { ok: false, message: "Envie uma nova foto para esta modificação." };
  }

  const finalized = await finalizePhoto(draft.photoPath, owned.auth.user.id, owned.auth.supabase);
  if (finalized.error) return { ok: false, message: "Não foi possível preparar a foto agora." };
  const projectPhotoUrl = modificationPhotoUrl(finalized.path);
  if (draft.photoPath && !projectPhotoUrl) {
    await cleanupMovedPhoto(draft.photoPath, finalized.path, owned.auth.user.id);
    return { ok: false, message: "O serviço de fotos está indisponível agora." };
  }
  let updateFailed: boolean;
  try {
    const { data, error } = await owned.auth.supabase
      .from("project_modifications")
      .update({
        catalog_id: input.catalogId,
        status: input.status,
        paid_amount: input.paidAmount,
        note: draft.note,
        public_description: draft.publicDescription,
        show_paid_amount: input.showPaidAmount === true,
        project_photo_storage_path: finalized.path,
        project_photo_url: projectPhotoUrl,
      })
      .eq("id", modificationId)
      .eq("car_id", carId)
      .select("id")
      .maybeSingle();
    updateFailed = Boolean(error || !data);
  } catch (error) {
    serverLog.warn("project-modification-photo", { action: "update.failed", message: error instanceof Error ? error.message : "unknown" });
    updateFailed = true;
  }
  if (updateFailed) {
    await cleanupMovedPhoto(draft.photoPath, finalized.path, owned.auth.user.id);
    return { ok: false, message: "Não foi possível atualizar a modificação agora." };
  }

  if (current.project_photo_storage_path && current.project_photo_storage_path !== finalized.path) {
    await removeUnreferencedModificationPhoto(current.project_photo_storage_path, owned.auth.user.id, false);
  }
  refreshModificationPage(owned.car.slug);
  return { ok: true, message: "Modificação atualizada." };
}

export async function deleteProjectModification(carId: string, modificationId: string): Promise<ActionResult> {
  const owned = await getOwnedCar(carId);
  if ("error" in owned) return { ok: false, message: owned.error ?? "Entre para continuar." };
  if (!UUID.test(modificationId)) return { ok: false, message: "Modificação inválida." };

  const { data: current } = await owned.auth.supabase
    .from("project_modifications")
    .select("id, project_photo_storage_path")
    .eq("id", modificationId)
    .eq("car_id", carId)
    .maybeSingle();
  if (!current) return { ok: false, message: "Modificação não encontrada." };

  const { data: deleted, error } = await owned.auth.supabase
    .from("project_modifications")
    .delete()
    .eq("id", modificationId)
    .eq("car_id", carId)
    .select("id")
    .maybeSingle();
  if (error || !deleted) return { ok: false, message: "Não foi possível excluir a modificação agora." };

  if (current.project_photo_storage_path) {
    await removeUnreferencedModificationPhoto(current.project_photo_storage_path, owned.auth.user.id, false);
  }
  refreshModificationPage(owned.car.slug);
  return { ok: true, message: "Modificação excluída." };
}
