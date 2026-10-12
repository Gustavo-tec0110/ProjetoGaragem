import { EmptyRankingsPageSkeleton, RankingsPageSkeleton } from "@/components/ui/page-skeletons";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function LoadingRankingsPage() {
  return isSupabaseConfigured ? <RankingsPageSkeleton /> : <EmptyRankingsPageSkeleton />;
}
