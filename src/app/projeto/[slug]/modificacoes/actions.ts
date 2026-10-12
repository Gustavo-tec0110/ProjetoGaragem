"use server";

import { revalidatePath } from "next/cache";

import { serverLog } from "@/lib/server-log";
import { PROJECT_IMAGES_BUCKET } from "@/lib/supabase/storage";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { requireSupabaseUser } from "@/lib/supabase/auth-server";
import type { ProjectModificationStatus } from "@/lib/types";

const STATUSES = new Set<ProjectModificationStatus>(["installed", "planned", "wishlist", "removed"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ModificationDraftInput = {
  catalogId: string;
  status: ProjectModificationStatus;
  paidAmount: number | null;
  note: string;
  photoPath: string | null;
};

type ActionResult = { ok: boolean; message: string };

function validateDraft(input: ModificationDraftInput, userId: string) {
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

  const photoPath = input.photoPath?.trim() || null;
  if (photoPath && !new RegExp(`^${userId}/modifications/[0-9a-f-]{36}\\.webp$`, "i").test(photoPath)) {
    return { error: "A foto enviada não é válida para esta conta." } as const;
  }

  return { note: note || null, photoPath } as const;
}

function modificationPhotoUrl(path: string | null) {
  if (!path) return null;
  const storage = getSupabaseServiceRoleClient();
  if (!storage) return null;
  return storage.storage.from(PROJECT_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function removeOwnedModificationPhoto(path: string | null, userId: string) {
  if (!path || !path.startsWith(`${userId}/modifications/`)) return;
  const storage = getSupabaseServiceRoleClient();
  if (!storage) {
    serverLog.warn("project-modification-photo", { action: "remove.skipped", reason: "service_role_unavailable" });
    return;
  }
  const { error } = await storage.storage.from(PROJECT_IMAGES_BUCKET).remove([path]);
  if (error) {
    serverLog.warn("project-modification-photo", { action: "remove.failed", code: error.name, message: error.message });
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
  const { data: catalogItem } = await owned.auth.supabase
    .from("modification_catalog")
    .select("id")
    .eq("id", input.catalogId)
    .eq("is_active", true)
    .maybeSingle();
  if (!catalogItem) return { ok: false, message: "Esta modificação não está disponível no catálogo." };

  const projectPhotoUrl = modificationPhotoUrl(draft.photoPath);
  if (draft.photoPath && !projectPhotoUrl) return { ok: false, message: "O serviço de fotos está indisponível agora." };
  const { error } = await owned.auth.supabase.from("project_modifications").insert({
    car_id: carId,
    catalog_id: input.catalogId,
    status: input.status,
    paid_amount: input.paidAmount,
    note: draft.note,
    project_photo_storage_path: draft.photoPath,
    project_photo_url: projectPhotoUrl,
  });
  if (error) return { ok: false, message: "Não foi possível salvar a modificação agora." };

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

  const projectPhotoUrl = modificationPhotoUrl(draft.photoPath);
  if (draft.photoPath && !projectPhotoUrl) return { ok: false, message: "O serviço de fotos está indisponível agora." };
  const { error } = await owned.auth.supabase
    .from("project_modifications")
    .update({
      catalog_id: input.catalogId,
      status: input.status,
      paid_amount: input.paidAmount,
      note: draft.note,
      project_photo_storage_path: draft.photoPath,
      project_photo_url: projectPhotoUrl,
    })
    .eq("id", modificationId)
    .eq("car_id", carId);
  if (error) return { ok: false, message: "Não foi possível atualizar a modificação agora." };

  if (current.project_photo_storage_path !== draft.photoPath) {
    await removeOwnedModificationPhoto(current.project_photo_storage_path, owned.auth.user.id);
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

  const { error } = await owned.auth.supabase
    .from("project_modifications")
    .delete()
    .eq("id", modificationId)
    .eq("car_id", carId);
  if (error) return { ok: false, message: "Não foi possível excluir a modificação agora." };

  await removeOwnedModificationPhoto(current.project_photo_storage_path, owned.auth.user.id);
  refreshModificationPage(owned.car.slug);
  return { ok: true, message: "Modificação excluída." };
}
