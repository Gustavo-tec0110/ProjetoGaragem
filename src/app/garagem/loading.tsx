import { GaragePageSkeleton, LocalGaragePageSkeleton } from "@/components/ui/page-skeletons";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function LoadingGaragePage() {
  return isSupabaseConfigured ? <GaragePageSkeleton /> : <LocalGaragePageSkeleton />;
}
