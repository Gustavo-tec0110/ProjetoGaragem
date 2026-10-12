import { EmptyUpdatesPageSkeleton, UpdatesPageSkeleton } from "@/components/ui/page-skeletons";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function LoadingUpdatesPage() {
  return isSupabaseConfigured ? <UpdatesPageSkeleton /> : <EmptyUpdatesPageSkeleton />;
}
