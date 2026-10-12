import { AccessCardSkeleton, ProfileFormSkeleton, StandardSkeletonShell } from "@/components/ui/page-skeletons";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function LoadingOwnProfilePage() {
  return isSupabaseConfigured ? <StandardSkeletonShell maxWidth="max-w-3xl"><ProfileFormSkeleton /></StandardSkeletonShell> : <AccessCardSkeleton />;
}
