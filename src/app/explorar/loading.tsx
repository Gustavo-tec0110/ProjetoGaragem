import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingExplorarPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-12 pt-24 sm:px-6">
      <Card className="p-4 md:p-5">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_0.9fr_1fr_0.9fr_auto]">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-3xl" />
          ))}
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-2 md:gap-4 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-3xl border border-border/60 md:hidden"
          >
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <div className="grid grid-cols-2 gap-px border-y border-border/60 bg-border/60 p-px">
              {Array.from({ length: 4 }).map((__, metricIndex) => (
                <Skeleton key={metricIndex} className="h-8 rounded-none" />
              ))}
            </div>
            <div className="p-2">
              <Skeleton className="h-11 w-full rounded-3xl" />
            </div>
          </div>
        ))}
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="hidden h-96 w-full rounded-4xl md:block" />
        ))}
      </div>
    </div>
  );
}
