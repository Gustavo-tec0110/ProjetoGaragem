import { DiscoveryPageSkeleton, EmptyDiscoveryPageSkeleton } from "@/components/ui/page-skeletons";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function LoadingExplorarPage() {
  return isSupabaseConfigured ? <DiscoveryPageSkeleton /> : <EmptyDiscoveryPageSkeleton />;
}
