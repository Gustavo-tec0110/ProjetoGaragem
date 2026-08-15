import { SkeletonForm, StandardSkeletonShell } from "@/components/ui/page-skeletons";

export default function LoadingOnboardingPage() {
  return <StandardSkeletonShell maxWidth="max-w-3xl"><SkeletonForm /></StandardSkeletonShell>;
}
