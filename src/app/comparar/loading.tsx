import { ComparePageSkeleton, EmptyComparePageSkeleton } from "@/components/ui/page-skeletons";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function LoadingComparePage() {
  return isSupabaseConfigured ? <ComparePageSkeleton /> : <EmptyComparePageSkeleton />;
}
