import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { PremiumCard } from "@/components/ui/premium-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl pt-24 pb-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <Skeleton className="h-3 w-28 rounded-full" />
              <Skeleton className="mt-3 h-10 w-[min(520px,86vw)]" />
              <Skeleton className="mt-3 h-4 w-[min(620px,92vw)]" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_420px] lg:items-start">
            <div className="space-y-6">
              <PremiumCard className="p-4 md:p-5">
                <Skeleton className="aspect-[16/11] sm:aspect-[16/9] rounded-4xl" />
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-24 sm:h-20 sm:w-28 shrink-0" />
                  ))}
                </div>
              </PremiumCard>

              {Array.from({ length: 4 }).map((_, i) => (
                <PremiumCard key={i} className="p-6">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-3 h-7 w-[min(360px,80vw)]" />
                  <Skeleton className="mt-5 h-24 w-full" />
                </PremiumCard>
              ))}
            </div>

            <div className="space-y-4 lg:sticky lg:top-24">
              <PremiumCard className="p-6">
                <Skeleton className="h-12 w-40" />
                <Skeleton className="mt-5 h-24 w-full" />
                <Skeleton className="mt-3 h-24 w-full" />
                <Skeleton className="mt-5 h-10 w-full" />
                <Skeleton className="mt-2 h-10 w-full" />
              </PremiumCard>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

