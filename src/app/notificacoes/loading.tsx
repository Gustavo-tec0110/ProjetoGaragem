import { EmptyNotificationsPageSkeleton, NotificationsPageSkeleton } from "@/components/ui/page-skeletons";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function LoadingNotificationsPage() {
  return isSupabaseConfigured ? <NotificationsPageSkeleton /> : <EmptyNotificationsPageSkeleton />;
}
