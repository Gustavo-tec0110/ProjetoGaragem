import { getSupabaseServerUser } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { authenticated: Boolean(await getSupabaseServerUser()) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
