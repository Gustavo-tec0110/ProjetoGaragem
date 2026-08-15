import { SkeletonForm, StandardSkeletonShell } from "@/components/ui/page-skeletons";

export default function LoadingEditProjectPage() {
  return <StandardSkeletonShell maxWidth="max-w-5xl"><SkeletonForm /></StandardSkeletonShell>;
}
