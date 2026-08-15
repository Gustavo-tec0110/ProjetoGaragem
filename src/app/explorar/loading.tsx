import { SkeletonPageHeader, SkeletonProjectGrid, StandardSkeletonShell } from "@/components/ui/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingExplorarPage() {
  return (
    <StandardSkeletonShell>
      <SkeletonPageHeader />
      <div className="mt-8 rounded-4xl border border-border/70 bg-card/35 p-4 md:p-6">
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="mt-3 flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-10 w-28 shrink-0 rounded-full" />)}
        </div>
      </div>
      <section className="mt-8"><Skeleton className="mb-4 h-8 w-56" /><SkeletonProjectGrid /></section>
    </StandardSkeletonShell>
  );
}
