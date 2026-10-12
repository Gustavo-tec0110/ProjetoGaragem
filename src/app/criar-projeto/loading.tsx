import { LocalProjectFormSkeleton, ProjectFormSkeleton, StandardSkeletonShell } from "@/components/ui/page-skeletons";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function LoadingCreateProjectPage() {
  return <StandardSkeletonShell maxWidth="max-w-5xl">{isSupabaseConfigured ? <ProjectFormSkeleton /> : <LocalProjectFormSkeleton />}</StandardSkeletonShell>;
}
