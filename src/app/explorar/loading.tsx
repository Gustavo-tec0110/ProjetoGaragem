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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-96 w-full rounded-4xl" />
        ))}
      </div>
    </div>
  );
}
