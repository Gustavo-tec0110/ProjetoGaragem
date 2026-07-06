import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingPublicProfilePage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-12 pt-24 sm:px-6">
      <Card className="p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_28rem]">
          <div className="flex gap-4">
            <Skeleton className="size-20 shrink-0 rounded-full md:size-24" />
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-16 w-full max-w-xl" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full rounded-4xl" />
            ))}
          </div>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-96 w-full rounded-4xl" />
        ))}
      </div>
    </div>
  );
}
