import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function SkeletonText({ className }: { className?: string }) {
  return <Skeleton className={cn("h-4 rounded-full border-0", className)} />;
}

export function SkeletonButton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-11 w-36 rounded-xl", className)} />;
}

export function SkeletonAvatar({ className }: { className?: string }) {
  return <Skeleton className={cn("size-16 shrink-0 rounded-full md:size-24", className)} />;
}

export function SkeletonPageHeader({ action = true }: { action?: boolean }) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="w-full max-w-3xl space-y-3">
        <SkeletonText className="w-24" />
        <Skeleton className="h-10 w-4/5 max-w-xl md:h-14" />
        <SkeletonText className="w-full" />
        <SkeletonText className="w-2/3" />
      </div>
      {action ? <SkeletonButton className="shrink-0" /> : null}
    </div>
  );
}

export function SkeletonProjectCard() {
  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 bg-card/40">
      <Skeleton className="aspect-[4/3] w-full rounded-none border-0" />
      <div className="space-y-2 p-3 md:space-y-3 md:p-5">
        <SkeletonText className="h-5 w-4/5" />
        <SkeletonText className="w-3/5" />
        <SkeletonText className="w-2/5" />
        <div className="grid grid-cols-2 gap-1 pt-1 md:grid-cols-4 md:gap-2 md:pt-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-9 rounded-xl md:h-10 md:rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-[1fr_2.75rem] gap-1 pt-1 md:grid-cols-[1fr_auto] md:gap-2">
          <Skeleton className="h-11 rounded-xl md:h-9" />
          <Skeleton className="h-11 rounded-xl md:h-9 md:w-12" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonProjectGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:gap-5 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => <SkeletonProjectCard key={index} />)}
    </div>
  );
}

export function SkeletonMetric() {
  return (
    <div className="rounded-3xl border border-border/70 bg-card/35 p-3 md:p-5">
      <Skeleton className="size-5 rounded-lg" />
      <SkeletonText className="mt-3 w-3/4" />
      <SkeletonText className="mt-2 h-7 w-1/2" />
    </div>
  );
}

export function SkeletonListItem({ thumbnail = false }: { thumbnail?: boolean }) {
  return (
    <div className="flex min-h-20 items-center gap-3 rounded-3xl border border-border/70 bg-card/35 p-3 md:p-4">
      {thumbnail ? <Skeleton className="size-14 shrink-0 rounded-2xl md:size-16" /> : <Skeleton className="size-8 shrink-0 rounded-full" />}
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonText className="h-5 w-2/3" />
        <SkeletonText className="w-4/5" />
        <SkeletonText className="h-3 w-1/3" />
      </div>
      <Skeleton className="hidden h-9 w-24 rounded-xl sm:block" />
    </div>
  );
}

export function SkeletonForm() {
  return (
    <div className="space-y-6" aria-label="Carregando formulário">
      <SkeletonPageHeader action={false} />
      <div className="grid gap-4 rounded-4xl border border-border/70 bg-card/35 p-4 md:grid-cols-2 md:p-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div className={cn("space-y-2", index > 5 && "md:col-span-2")} key={index}>
            <SkeletonText className="w-24" />
            <Skeleton className={cn("h-12 w-full rounded-xl", index > 5 && "h-28")} />
          </div>
        ))}
        <SkeletonButton className="md:col-span-2" />
      </div>
    </div>
  );
}

export function StandardSkeletonShell({ children, maxWidth = "max-w-6xl" }: { children: ReactNode; maxWidth?: string }) {
  return (
    <main className={cn("mobile-page-shell mx-auto w-full flex-1 px-4 pb-12 sm:px-6 md:pt-24", maxWidth)} aria-busy="true">
      {children}
    </main>
  );
}

export function UpdatesPageSkeleton() {
  return (
    <StandardSkeletonShell>
      <SkeletonPageHeader />
      <section className="mt-8">
        <SkeletonText className="w-24" /><Skeleton className="mt-2 h-8 w-64" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-4xl" />)}</div>
      </section>
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, column) => <div className="rounded-4xl border border-border/70 bg-card/35 p-5" key={column}><Skeleton className="h-8 w-48" /><div className="mt-4 grid gap-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonListItem key={i} />)}</div></div>)}
      </section>
    </StandardSkeletonShell>
  );
}

export function RankingsPageSkeleton() {
  return (
    <StandardSkeletonShell>
      <section className="rounded-4xl border border-border/70 bg-card/35 p-4 md:p-8">
        <SkeletonPageHeader action={false} />
        <div className="mt-6 flex gap-2 overflow-hidden">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-full" />)}</div>
      </section>
      <section className="mt-8"><Skeleton className="h-9 w-56" /><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 md:h-80" />)}</div></section>
      <section className="mt-10"><Skeleton className="h-9 w-64" /><div className="mt-6 grid gap-3">{Array.from({ length: 5 }).map((_, i) => <SkeletonListItem key={i} thumbnail />)}</div></section>
    </StandardSkeletonShell>
  );
}

export function GaragePageSkeleton() {
  return (
    <StandardSkeletonShell>
      <SkeletonPageHeader />
      <div className="mt-8 grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <SkeletonMetric key={i} />)}</div>
      <section className="mt-8"><Skeleton className="h-9 w-56" /><div className="mt-4 flex gap-2 overflow-hidden">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-28 shrink-0 rounded-full" />)}</div><div className="mt-6"><SkeletonProjectGrid count={3} /></div></section>
    </StandardSkeletonShell>
  );
}

export function ComparePageSkeleton() {
  return (
    <StandardSkeletonShell>
      <SkeletonPageHeader action={false} />
      <div className="mt-8 grid gap-3 rounded-4xl border border-border/70 bg-card/35 p-5 md:grid-cols-[1fr_1fr_auto]"><Skeleton className="h-12" /><Skeleton className="h-12" /><SkeletonButton /></div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-80 md:h-96" />)}</div>
      <section className="mt-10"><Skeleton className="h-9 w-64" /><div className="mt-4 grid gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div></section>
    </StandardSkeletonShell>
  );
}

export function NotificationsPageSkeleton() {
  return (
    <StandardSkeletonShell maxWidth="max-w-4xl">
      <SkeletonPageHeader />
      <div className="mt-8 grid gap-3">{Array.from({ length: 6 }).map((_, i) => <SkeletonListItem key={i} />)}</div>
    </StandardSkeletonShell>
  );
}

export function ProfileContentSkeleton() {
  return (
    <>
      <div className="rounded-4xl border border-border/70 bg-card/35 p-4 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_28rem]"><div className="flex gap-4"><SkeletonAvatar /><div className="flex-1 space-y-3"><SkeletonText className="w-28" /><Skeleton className="h-10 w-full max-w-sm" /><SkeletonText className="w-36" /><SkeletonText className="w-full" /><SkeletonButton /></div></div><div className="grid grid-cols-2 gap-2 md:gap-3">{Array.from({ length: 8 }).map((_, i) => <SkeletonMetric key={i} />)}</div></div>
      </div>
      <section className="mt-10"><Skeleton className="h-9 w-64" /><div className="mt-4"><SkeletonProjectGrid count={3} /></div></section>
    </>
  );
}

export function ProfilePageSkeleton() {
  return (
    <StandardSkeletonShell>
      <ProfileContentSkeleton />
    </StandardSkeletonShell>
  );
}
