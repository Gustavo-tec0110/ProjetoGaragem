import { SkeletonButton, SkeletonText } from "@/components/ui/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingProjectPage() {
  return (
    <div className="w-full flex-1" aria-busy="true">
      <section className="px-4 sm:px-6">
        <div className="mx-auto grid w-full max-w-6xl gap-4 pb-10 pt-24 lg:min-h-[78vh] lg:grid-cols-[1fr_0.9fr] lg:content-end lg:gap-x-8 lg:pt-28">
          <div className="flex flex-col justify-end space-y-4">
            <SkeletonText className="w-32" />
            <Skeleton className="h-16 w-full max-w-xl md:h-24" />
            <SkeletonText className="w-56" />
            <div className="flex items-center gap-3"><Skeleton className="size-10 rounded-full" /><SkeletonText className="w-40" /></div>
            <SkeletonText className="w-full max-w-xl" /><SkeletonText className="w-4/5 max-w-lg" />
            <div className="flex flex-wrap gap-2"><SkeletonButton /><SkeletonButton /></div>
          </div>
          <Skeleton className="aspect-[4/3] w-full sm:aspect-[16/10] lg:min-h-[34rem] lg:aspect-auto" />
          <div className="hidden grid-cols-3 gap-3 lg:grid">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        </div>
      </section>
      <div className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6">
        <Skeleton className="h-14 w-full" />
        <div className="mt-6 grid grid-cols-5 gap-1.5 sm:gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 md:h-32" />)}</div>
        <div className="mt-8 grid gap-4 lg:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
      </div>
    </div>
  );
}
