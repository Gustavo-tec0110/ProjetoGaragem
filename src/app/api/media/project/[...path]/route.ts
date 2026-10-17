import { deliverProjectImage, MEDIA_NO_STORE_HEADERS } from "@/lib/images/delivery";
import { imageResizeOptions, resizeProjectImage } from "@/lib/images/resize";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { PROJECT_IMAGES_BUCKET } from "@/lib/supabase/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function respond(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  let resize: ReturnType<typeof imageResizeOptions>;
  try {
    resize = imageResizeOptions(new URL(request.url).searchParams);
  } catch {
    return new Response(null, { status: 400, headers: MEDIA_NO_STORE_HEADERS });
  }
  // This client uses the request cookies. The RPC derives auth.uid() from its
  // verified JWT, never from a caller-supplied user ID or an unverified cookie.
  const session = await getSupabaseServerClient();
  return deliverProjectImage(path, {
    transform: resize ? (blob) => resizeProjectImage(blob, resize) : undefined,
    authorize: async (target) => {
      if (!session) return null;
      const { data, error } = await session.rpc("can_read_project_image", { p_path: target });
      return error ? null : data === true;
    },
    download: async (target) => {
      const service = getSupabaseServiceRoleClient();
      if (!service) throw new Error("Storage unavailable");
      const { data, error } = await service.storage.from(PROJECT_IMAGES_BUCKET).download(target, {}, {
        // Explicitly disable the Next fetch cache, including the upstream read.
        cache: "no-store",
      });
      if (error) throw new Error("Storage unavailable");
      return data;
    },
  }, request.method === "HEAD");
}

export const GET = respond;
export const HEAD = respond;
