import { ProfileFormSkeleton, StandardSkeletonShell } from "@/components/ui/page-skeletons";

export default function LoadingOnboardingPage() {
  return <StandardSkeletonShell maxWidth="max-w-3xl"><ProfileFormSkeleton /></StandardSkeletonShell>;
}
