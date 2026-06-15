import { qUnreadNotificationCount } from "@/lib/supabase/queries";

export async function GET() {
  const result = await qUnreadNotificationCount();

  return Response.json({
    count: result.data ?? 0,
  });
}
