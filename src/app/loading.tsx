import { Skeleton } from "@/components/ui/skeleton";

export default function RouteLoading() {
  return (
    <main
      className="mobile-page-shell mx-auto w-full max-w-6xl flex-1 px-4 pb-12 sm:px-6 md:pt-24"
      aria-label="Carregando página"
      aria-busy="true"
    >
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-full max-w-lg" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <div className="mt-8 grid grid-cols-2 gap-2.5 md:gap-5 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-border/60">
            <Skeleton className="aspect-[4/3] w-full rounded-none border-0" />
            <div className="space-y-3 p-3 md:p-5">
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
