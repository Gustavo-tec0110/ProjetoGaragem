import { Skeleton } from "@/components/ui/skeleton";

export default function RouteLoading() {
  return (
    <main
      className="mobile-page-shell mx-auto w-full max-w-6xl flex-1 px-4 pb-12 sm:px-6 md:pt-24"
      aria-label="Carregando página"
      aria-busy="true"
    >
      <div className="mx-auto max-w-xl space-y-3 pt-10 text-center md:pt-16">
        <Skeleton className="mx-auto size-10 rounded-full" />
        <Skeleton className="mx-auto h-5 w-44 rounded-full" />
        <Skeleton className="mx-auto h-4 w-64 max-w-full rounded-full" />
      </div>
    </main>
  );
}
