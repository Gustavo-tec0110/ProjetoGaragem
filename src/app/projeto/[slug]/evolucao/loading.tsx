import { SkeletonMetric, SkeletonPageHeader, StandardSkeletonShell } from "@/components/ui/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingEvolutionPage() {
  return (
    <StandardSkeletonShell>
      <SkeletonPageHeader />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => <SkeletonMetric key={index} />)}
      </div>
      <section className="mt-10">
        <Skeleton className="h-9 w-64" />
        <div className="mt-5 grid gap-3">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 w-full" />)}
        </div>
      </section>
    </StandardSkeletonShell>
  );
}
