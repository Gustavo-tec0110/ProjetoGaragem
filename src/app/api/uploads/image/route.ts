import { readBoundedBody } from "@/lib/security/bounded-body";
import { hasTrustedMutationOrigin } from "@/lib/security/request-origin";
import { NextResponse } from "next/server";

import { enforceActionRateLimit } from "@/lib/security/action-rate-limit";
import { UPLOAD_REQUEST_MAX_BYTES } from "@/lib/security/limits";
import { requireSupabaseUser } from "@/lib/supabase/auth-server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import {
  PROJECT_IMAGES_BUCKET,
  profileImagePath,
  projectImagePath,
  projectModificationImagePath,
} from "@/lib/supabase/storage";
import { validateAndNormalizeImage } from "@/lib/uploads/image-validation";
import { isOwnedModificationPhotoPath } from "@/lib/modifications/photo-path";
import { removeUnreferencedModificationPhoto } from "@/lib/modifications/photo-storage";
import { serverLog } from "@/lib/server-log";
import { projectImageUrl } from "@/lib/images/project-image-url";
import { MEDIA_NO_STORE_HEADERS } from "@/lib/images/delivery";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function contentLengthIsTooLarge(request: Request) {
  const value = Number(request.headers.get("content-length"));
  return Number.isFinite(value) && value > UPLOAD_REQUEST_MAX_BYTES;
}

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ message: "Origem inválida." }, { status: 403 });
  if (contentLengthIsTooLarge(request)) {
    return NextResponse.json({ message: "O arquivo excede o limite permitido." }, { status: 413 });
  }

  const auth = await requireSupabaseUser();
  if (!auth.supabase || !auth.user) {
    return NextResponse.json({ message: "Entre na sua conta para enviar imagens." }, { status: 401 });
  }

  const rate = await enforceActionRateLimit(auth.supabase, "upload_image");
  if (!rate.ok) return NextResponse.json({ message: rate.message }, { status: 429 });

  let formData: FormData;
  try {
    formData = await (await readBoundedBody(request, UPLOAD_REQUEST_MAX_BYTES)).formData();
  } catch (error) {
    if (error instanceof Error && error.message === "body_too_large") return NextResponse.json({ message: "Solicitação muito grande." }, { status: 413 });
    return NextResponse.json({ message: "Upload inválido." }, { status: 400 });
  }

  const entries = Array.from(formData.entries());
  if (entries.length !== 2 || entries.some(([key]) => key !== "kind" && key !== "file")) {
    return NextResponse.json({ message: "Upload inválido." }, { status: 400 });
  }
  const kind = formData.get("kind");
  const file = formData.get("file");
  if ((kind !== "project" && kind !== "modification" && kind !== "avatar" && kind !== "cover") || !(file instanceof File)) {
    return NextResponse.json({ message: "Upload inválido." }, { status: 400 });
  }

  let normalized: Awaited<ReturnType<typeof validateAndNormalizeImage>>;
  try {
    normalized = await validateAndNormalizeImage(file);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Imagem inválida." },
      { status: 400 }
    );
  }

  const normalizedFile = { name: "imagem.webp", type: normalized.contentType };
  const path = kind === "project"
    ? projectImagePath(auth.user.id, normalizedFile)
    : kind === "modification"
      ? projectModificationImagePath(auth.user.id)
      : profileImagePath(auth.user.id, kind, normalizedFile);

  const storage = getSupabaseServiceRoleClient();
  if (!storage) {
    return NextResponse.json({ message: "Upload indisponível no momento." }, { status: 503 });
  }

  const reservationClient = auth.supabase as unknown as {
    rpc: (name: string, args: Record<string, number>) => Promise<{ data: string | null; error: unknown }>;
  };
  const { data: reservationId, error: reservationError } = await reservationClient.rpc(
    "reserve_storage_upload",
    { p_new_bytes: normalized.data.byteLength }
  );
  if (reservationError || !reservationId) {
    return NextResponse.json(
      { message: "Não foi possível confirmar a quota de imagens agora." },
      { status: 429 }
    );
  }

  const { error: uploadError } = await (async () => {
    try {
      return await storage.storage.from(PROJECT_IMAGES_BUCKET).upload(path, normalized.data, {
        cacheControl: "0",
        contentType: normalized.contentType,
        upsert: false,
      });
    } finally {
      const releaseClient = storage as unknown as {
        rpc: (name: string, args: Record<string, string>) => Promise<{ error: unknown }>;
      };
      await releaseClient.rpc("release_storage_upload_reservation", { p_reservation_id: reservationId });
    }
  })();

  if (uploadError) {
    return NextResponse.json({ message: "Não foi possível salvar a imagem agora." }, { status: 400 });
  }

  if (kind === "modification") {
    const { data: leased, error: leaseError } = await auth.supabase.rpc("touch_pending_modification_photo", { p_path: path });
    if (leaseError || leased !== true) {
      serverLog.warn("project-modification-photo", { action: "lease.failed", message: leaseError?.message });
      const compensation = await storage.storage.from(PROJECT_IMAGES_BUCKET).remove([path]);
      if (compensation.error) serverLog.warn("project-modification-photo", { action: "lease.compensation.failed", message: compensation.error.message });
      return NextResponse.json({ message: "Não foi possível preparar a edição da foto. Tente novamente." }, { status: 503 });
    }
  }

  return NextResponse.json({
    url: projectImageUrl(path),
    path,
    width: normalized.width,
    height: normalized.height,
  }, { status: 201, headers: MEDIA_NO_STORE_HEADERS });
}

export async function PATCH(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ message: "Origem inválida." }, { status: 403 });
  const auth = await requireSupabaseUser();
  if (!auth.supabase || !auth.user) return NextResponse.json({ message: "Entre para continuar." }, { status: 401 });
  let path: unknown;
  try {
    if (Number(request.headers.get("content-length")) > 1024) throw new Error("large request");
    path = (await (await readBoundedBody(request, 1024)).json() as { path?: unknown }).path;
  } catch (error) {
    if (error instanceof Error && error.message === "body_too_large") return NextResponse.json({ message: "Solicitação muito grande." }, { status: 413 });
    return NextResponse.json({ message: "Solicitação inválida." }, { status: 400 });
  }
  if (typeof path !== "string" || !isOwnedModificationPhotoPath(path, auth.user.id, true)) {
    return NextResponse.json({ message: "Caminho inválido." }, { status: 400 });
  }
  const { data, error } = await auth.supabase.rpc("touch_pending_modification_photo", { p_path: path });
  return error || data !== true
    ? NextResponse.json({ message: "Não foi possível renovar a edição." }, { status: error ? 503 : 409 })
    : NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ message: "Origem inválida." }, { status: 403 });
  const auth = await requireSupabaseUser();
  if (!auth.user) return NextResponse.json({ message: "Entre para continuar." }, { status: 401 });
  let path: unknown;
  try {
    if (Number(request.headers.get("content-length")) > 1024) throw new Error("large request");
    path = (await (await readBoundedBody(request, 1024)).json() as { path?: unknown }).path;
  } catch (error) {
    if (error instanceof Error && error.message === "body_too_large") return NextResponse.json({ message: "Solicitação muito grande." }, { status: 413 });
    return NextResponse.json({ message: "Solicitação inválida." }, { status: 400 });
  }
  if (typeof path !== "string" || !isOwnedModificationPhotoPath(path, auth.user.id, true)) {
    return NextResponse.json({ message: "Caminho inválido." }, { status: 400 });
  }
  const removed = await removeUnreferencedModificationPhoto(path, auth.user.id, true);
  return NextResponse.json({ removed });
}
