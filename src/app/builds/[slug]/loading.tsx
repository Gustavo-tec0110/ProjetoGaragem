import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="px-4 sm:px-6">
      <div className="mx-auto w-full max-w-6xl pt-20 md:pt-24 pb-12 space-y-4">
        <Skeleton className="h-28 rounded-4xl" />
        <Skeleton className="h-72 rounded-4xl" />
        <Skeleton className="h-40 rounded-4xl" />
      </div>
    </div>
  );
}

