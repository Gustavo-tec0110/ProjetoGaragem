import { NextResponse } from "next/server";

import { enforceActionRateLimit } from "@/lib/security/action-rate-limit";
import { UPLOAD_REQUEST_MAX_BYTES } from "@/lib/security/limits";
import { requireSupabaseUser } from "@/lib/supabase/auth-server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { PROJECT_IMAGES_BUCKET, profileImagePath, projectImagePath } from "@/lib/supabase/storage";
import { validateAndNormalizeImage } from "@/lib/uploads/image-validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function contentLengthIsTooLarge(request: Request) {
  const value = Number(request.headers.get("content-length"));
  return Number.isFinite(value) && value > UPLOAD_REQUEST_MAX_BYTES;
}

export async function POST(request: Request) {
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
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "Upload inválido." }, { status: 400 });
  }

  const entries = Array.from(formData.entries());
  if (entries.length !== 2 || entries.some(([key]) => key !== "kind" && key !== "file")) {
    return NextResponse.json({ message: "Upload inválido." }, { status: 400 });
  }
  const kind = formData.get("kind");
  const file = formData.get("file");
  if ((kind !== "project" && kind !== "avatar" && kind !== "cover") || !(file instanceof File)) {
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
        cacheControl: "31536000",
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

  const { data } = storage.storage.from(PROJECT_IMAGES_BUCKET).getPublicUrl(path);
  return NextResponse.json({
    url: data.publicUrl,
    width: normalized.width,
    height: normalized.height,
  }, { status: 201 });
}
