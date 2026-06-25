import { qUnreadNotificationCount } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await qUnreadNotificationCount();

  if (result.error) {
    console.error("[notification-query] unread-count.route", { message: result.error });
  }

  return Response.json(
    {
      count: result.data ?? 0,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
