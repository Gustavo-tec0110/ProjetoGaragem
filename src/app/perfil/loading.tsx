import { ProfileFormSkeleton, StandardSkeletonShell } from "@/components/ui/page-skeletons";

export default function LoadingOwnProfilePage() {
  return <StandardSkeletonShell maxWidth="max-w-3xl"><ProfileFormSkeleton /></StandardSkeletonShell>;
}
