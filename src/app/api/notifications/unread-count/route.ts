import { qUnreadNotificationCount } from "@/lib/supabase/queries";
import { serverLog } from "@/lib/server-log";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await qUnreadNotificationCount();

  if (result.error) {
    serverLog.error("notification-query", {
      action: "unread-count.route",
      message: result.error,
    });
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
