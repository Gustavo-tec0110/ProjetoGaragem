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
  return <Skeleton className={cn("size-24 shrink-0 rounded-full sm:size-28 lg:size-32", className)} />;
}

export function StandardSkeletonShell({ children, maxWidth = "max-w-6xl", className }: { children: ReactNode; maxWidth?: string; className?: string }) {
  return (
    <main className={cn("mobile-page-shell mx-auto w-full flex-1 px-4 pb-12 sm:px-6 md:pt-24", maxWidth, className)} aria-busy="true" aria-label="Carregando conteúdo" data-page-skeleton>
      {children}
    </main>
  );
}

export function SkeletonPageHeader({ action = true, bordered = false }: { action?: boolean; bordered?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-5 md:flex-row md:items-end md:justify-between", bordered && "border-b border-border/55 pb-6 md:gap-8 md:pb-8")}>
      <div className="w-full max-w-3xl">
        <SkeletonText className="w-24" />
        <Skeleton className="mt-2 h-9 w-4/5 max-w-xl md:h-14" />
        <SkeletonText className="mt-3 w-full" />
        <SkeletonText className="mt-2 w-2/3" />
      </div>
      {action ? <SkeletonButton className="shrink-0" /> : null}
    </div>
  );
}

export function SkeletonProjectCard({ profile = false }: { profile?: boolean }) {
  if (profile) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/40">
        <Skeleton className="aspect-[16/10] w-full rounded-none border-0" />
        <div className="p-4">
          <SkeletonText className="h-5 w-3/4" /><SkeletonText className="mt-2 w-1/2" />
          <SkeletonText className="mt-4 w-full" /><SkeletonText className="mt-2 w-4/5" />
          <div className="mt-4 flex gap-5 border-t border-border/55 pt-3"><Skeleton className="h-4 w-12" /><Skeleton className="h-4 w-12" /><Skeleton className="ml-auto size-4" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/40">
      <Skeleton className="aspect-[4/3] w-full rounded-none border-0" />
      <div className="px-3 pb-2 pt-3 md:p-5">
        <SkeletonText className="h-5 w-4/5 md:h-7" /><SkeletonText className="mt-2 w-3/5" /><SkeletonText className="mt-2 w-2/5" />
        <div className="mt-3 grid grid-cols-[1fr_2.75rem] gap-1 md:mt-4 md:flex md:justify-end md:gap-2"><Skeleton className="h-11 rounded-xl md:h-9 md:w-20" /><Skeleton className="h-11 rounded-xl md:h-9 md:w-12" /></div>
        <div className="mt-2 grid grid-cols-2 gap-px md:grid-cols-4 md:py-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-9 rounded-lg md:h-12" />)}</div>
        <div className="mt-4 hidden grid-cols-2 gap-2 md:grid"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        <div className="mt-4 hidden gap-2 md:flex"><Skeleton className="h-7 w-16 rounded-full" /><Skeleton className="h-7 w-20 rounded-full" /><Skeleton className="h-7 w-14 rounded-full" /></div>
      </div>
    </div>
  );
}

export function SkeletonProjectGrid({ count = 6, profile = false }: { count?: number; profile?: boolean }) {
  return <div className={cn("grid gap-2.5 md:gap-5", profile ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-2 xl:grid-cols-3")}>{Array.from({ length: count }).map((_, index) => <SkeletonProjectCard key={index} profile={profile} />)}</div>;
}

export function SkeletonMetric({ compact = false }: { compact?: boolean }) {
  return <div className={cn("rounded-xl border border-border/70 bg-card/35 p-3", !compact && "md:p-5")}><Skeleton className="size-4 rounded-md" /><SkeletonText className="mt-2 w-3/4" /><SkeletonText className="mt-2 h-6 w-1/2" /></div>;
}

export function SkeletonListItem({ thumbnail = false }: { thumbnail?: boolean }) {
  return (
    <div className="flex min-h-20 items-center gap-3 rounded-2xl border border-border/70 bg-card/35 p-3 md:p-4">
      <Skeleton className={cn("shrink-0", thumbnail ? "size-20 rounded-2xl md:h-20 md:w-28" : "size-9 rounded-full")} />
      <div className="min-w-0 flex-1"><SkeletonText className="h-5 w-2/3" /><SkeletonText className="mt-2 w-4/5" /><SkeletonText className="mt-2 h-3 w-1/3" /></div>
      <Skeleton className="hidden h-9 w-24 rounded-xl sm:block" />
    </div>
  );
}

function FormFieldSkeleton({ tall = false, wide = false }: { tall?: boolean; wide?: boolean }) {
  return <div className={cn("space-y-2", wide && "md:col-span-2")}><SkeletonText className="w-24" /><Skeleton className={cn("h-12 w-full rounded-xl", tall && "h-28")} /></div>;
}

export function ProjectFormSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6" aria-label="Carregando formulário do projeto">
      <div className="rounded-2xl border border-border/70 bg-card/35 p-4 md:p-6">
        <SkeletonText className="w-28" /><Skeleton className="mt-2 h-8 w-4/5 max-w-xl" /><SkeletonText className="mt-3 w-full max-w-2xl" />
        <div className="mt-5 grid gap-4 md:grid-cols-3"><FormFieldSkeleton wide /><FormFieldSkeleton /><FormFieldSkeleton /><FormFieldSkeleton /></div>
      </div>
      <div className="rounded-2xl border border-border/70 bg-card/35 p-4 md:p-6"><Skeleton className="h-7 w-40" /><SkeletonText className="mt-2 w-3/4" /><Skeleton className="mt-4 aspect-[16/7] w-full rounded-2xl" /></div>
      <div className="rounded-2xl border border-border/70 bg-card/35 p-4 md:p-6"><Skeleton className="h-7 w-44" /><div className="mt-4 flex gap-2"><Skeleton className="h-9 w-24 rounded-full" /><Skeleton className="h-9 w-20 rounded-full" /></div></div>
      <div className="rounded-2xl border border-border/70 bg-card/35 p-4 md:p-6"><Skeleton className="h-7 w-48" /><SkeletonText className="mt-2 w-4/5" /><Skeleton className="mt-5 h-12 w-full" /></div>
      <div className="mobile-cta-safe flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/35 p-3 sm:flex-row sm:items-center sm:justify-between"><SkeletonText className="w-full max-w-lg" /><SkeletonButton className="w-full sm:w-48" /></div>
    </div>
  );
}

export function ProfileFormSkeleton() {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/35 p-4 md:p-8">
      <SkeletonText className="w-28" /><Skeleton className="mt-2 h-8 w-64" /><SkeletonText className="mt-2 w-4/5" />
      <div className="mt-6 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-[auto_1fr]"><Skeleton className="size-28 rounded-2xl" /><Skeleton className="h-28 w-full rounded-2xl" /></div>
        <div className="grid gap-4 md:grid-cols-2"><FormFieldSkeleton /><FormFieldSkeleton /></div><FormFieldSkeleton tall />
        <div className="grid gap-4 md:grid-cols-2"><FormFieldSkeleton /><FormFieldSkeleton /></div>
        <div className="rounded-2xl border border-border/70 p-4"><Skeleton className="h-7 w-36" /><SkeletonText className="mt-2 w-4/5" /><div className="mt-4 grid gap-3"><FormFieldSkeleton /><FormFieldSkeleton /><FormFieldSkeleton /></div></div>
        <Skeleton className="h-24 w-full rounded-2xl" /><SkeletonButton className="w-full sm:ml-auto sm:w-36" />
      </div>
    </div>
  );
}

export function UpdatesPageSkeleton() {
  return <StandardSkeletonShell><SkeletonPageHeader /><section className="mt-8"><SkeletonText className="w-24" /><Skeleton className="mt-2 h-8 w-64" /><div className="mt-4 grid gap-4 md:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div></section><section className="mt-8 grid gap-6 lg:grid-cols-2">{Array.from({ length: 2 }).map((_, column) => <div className="rounded-2xl border border-border/70 bg-card/35 p-5" key={column}><Skeleton className="h-8 w-48" /><div className="mt-4 grid gap-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonListItem key={i} />)}</div></div>)}</section></StandardSkeletonShell>;
}

export function RankingsPageSkeleton() {
  return (
    <StandardSkeletonShell>
      <section className="rounded-4xl border border-border/70 bg-card/35 p-4 md:rounded-5xl md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between"><div className="w-full max-w-3xl"><div className="flex gap-2"><Skeleton className="h-7 w-32 rounded-full" /><Skeleton className="h-7 w-36 rounded-full" /></div><Skeleton className="mt-4 h-10 w-4/5 md:h-16" /><SkeletonText className="mt-4 w-full" /><SkeletonText className="mt-2 w-3/4" /></div><div className="grid grid-cols-3 gap-2 xl:w-[28rem]">{Array.from({ length: 3 }).map((_, i) => <SkeletonMetric compact key={i} />)}</div></div>
        <div className="mt-4 flex gap-2 overflow-hidden md:mt-8">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-full" />)}</div>
        <div className="mt-6"><SkeletonText className="w-28" /><Skeleton className="mt-2 h-8 w-64" /><SkeletonText className="mt-2 w-4/5" /></div>
      </section>
      <section className="mt-6 md:mt-10"><Skeleton className="h-9 w-56" /><div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-3 sm:gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] w-full rounded-3xl" />)}</div></section>
      <section className="mt-8 md:mt-12"><Skeleton className="h-9 w-64" /><div className="mt-6 grid gap-3">{Array.from({ length: 5 }).map((_, i) => <SkeletonListItem key={i} thumbnail />)}</div></section>
    </StandardSkeletonShell>
  );
}

export function GaragePageSkeleton() { return <StandardSkeletonShell><ProfileContentSkeleton owner /></StandardSkeletonShell>; }

export function ComparePageSkeleton() {
  return <StandardSkeletonShell><SkeletonPageHeader action={false} /><div className="mt-8 grid gap-3 rounded-2xl border border-border/70 bg-card/35 p-5 md:grid-cols-[1fr_1fr_auto]"><Skeleton className="h-12" /><Skeleton className="h-12" /><SkeletonButton /></div><div className="mt-8 grid gap-4 lg:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl lg:h-[36rem]" />)}</div><section className="mt-10"><SkeletonText className="w-32" /><Skeleton className="mt-2 h-8 w-64" /><div className="mt-4 grid gap-3">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl md:h-20" />)}</div></section></StandardSkeletonShell>;
}

export function NotificationsPageSkeleton() { return <StandardSkeletonShell maxWidth="max-w-4xl"><SkeletonPageHeader /><div className="mt-5 grid gap-3 md:mt-8">{Array.from({ length: 6 }).map((_, i) => <SkeletonListItem key={i} />)}</div></StandardSkeletonShell>; }

export function ProfileContentSkeleton({ owner = false }: { owner?: boolean }) {
  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/35">
        <Skeleton className="h-36 w-full rounded-none border-0 sm:h-48 lg:h-56" />
        <div className="relative px-4 pb-5 sm:px-6 sm:pb-6 lg:px-8"><div className="-mt-10 flex flex-col gap-5 sm:-mt-12 lg:grid lg:grid-cols-[1fr_23rem] lg:items-end lg:gap-8"><div><SkeletonAvatar /><Skeleton className="mt-3 h-8 w-56" /><SkeletonText className="mt-2 w-28" /><SkeletonText className="mt-3 w-full max-w-xl" /><SkeletonText className="mt-2 w-4/5 max-w-lg" /></div><div><div className="grid grid-cols-4 gap-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonMetric compact key={i} />)}</div><SkeletonButton className="mt-3 ml-auto" /></div></div></div>
      </div>
      <div className="mt-4 flex gap-3 overflow-hidden border-b border-border/70 pb-3">{Array.from({ length: owner ? 4 : 3 }).map((_, i) => <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-xl" />)}</div>
      <section className="mt-5 sm:mt-6"><div className="mb-4 flex items-center justify-between"><Skeleton className="h-8 w-48" />{owner ? <SkeletonButton className="h-9" /> : null}</div><SkeletonProjectGrid count={3} profile /></section>
    </>
  );
}

export function ProfilePageSkeleton() { return <StandardSkeletonShell><ProfileContentSkeleton /></StandardSkeletonShell>; }

function DiscoveryFiltersSkeleton() {
  return (
    <div className="mt-5 md:mt-8">
      <div className="rounded-2xl border border-border/70 bg-card/35 p-3 md:hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><Skeleton className="h-12 w-full rounded-xl" /><Skeleton className="h-12 w-20 rounded-xl" /></div>
        <div className="mt-2 flex items-center gap-2"><SkeletonText className="w-12 shrink-0" /><Skeleton className="h-10 min-w-0 flex-1 rounded-xl" /><Skeleton className="h-10 w-20 rounded-xl" /></div>
      </div>
      <div className="hidden rounded-2xl border border-border/70 bg-card/35 p-5 md:block">
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[1.6fr_repeat(4,minmax(0,0.75fr))_auto]">
          <Skeleton className="h-12 w-full rounded-xl lg:col-span-2 xl:col-span-1" />
          {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
          <Skeleton className="h-12 w-full rounded-xl lg:col-span-2 xl:col-span-1" />
        </div>
        <SkeletonText className="mt-3 w-4/5" />
      </div>
    </div>
  );
}

function DiscoverySectionSkeleton({ empty }: { empty: boolean }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4"><div><SkeletonText className="w-24" /><Skeleton className="mt-1 h-8 w-48" /></div><SkeletonButton className="h-9 w-20" /></div>
      {empty ? <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-border/70 bg-background/20 p-6 text-center md:min-h-28 md:p-8"><div className="w-full max-w-md"><Skeleton className="mx-auto h-6 w-4/5" /><SkeletonText className="mx-auto mt-2 w-2/3" /></div></div> : <SkeletonProjectGrid count={3} />}
    </section>
  );
}

function DiscoveryBodySkeleton({ empty }: { empty: boolean }) {
  return (
    <>
      <DiscoveryFiltersSkeleton />
      {empty ? <Skeleton className="mt-6 h-14 w-full rounded-2xl" /> : null}
      <section className="mt-7 md:mt-10"><div className="mb-4 flex items-end justify-between gap-4"><div><SkeletonText className="w-28" /><Skeleton className="mt-1 h-8 w-48" /></div><SkeletonButton className="h-9 w-24" /></div>{empty ? <SkeletonEmptyCard className="min-h-52 border-dashed bg-background/20" /> : <SkeletonProjectGrid />}</section>
      <div className="mt-12 grid gap-12">{Array.from({ length: 5 }).map((_, i) => <DiscoverySectionSkeleton empty={empty} key={i} />)}</div>
    </>
  );
}

export function DiscoveryPageSkeleton() {
  return <StandardSkeletonShell><SkeletonPageHeader bordered /><DiscoveryBodySkeleton empty={false} /></StandardSkeletonShell>;
}

export function EvolutionPageSkeleton() {
  return <StandardSkeletonShell><SkeletonPageHeader /><div className="mt-8 grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div><section className="mt-10"><SkeletonText className="w-24" /><Skeleton className="mt-2 h-8 w-64" /><div className="mt-5 grid gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div></section></StandardSkeletonShell>;
}

export function ModificationsPageSkeleton() {
  return <StandardSkeletonShell maxWidth="max-w-7xl" className="md:pt-10"><SkeletonText className="w-36" /><SkeletonText className="mt-5 w-32" /><Skeleton className="mt-2 h-10 w-64" /><SkeletonText className="mt-3 w-full max-w-2xl" /><SkeletonText className="mt-2 w-4/5 max-w-xl" /><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div className="rounded-2xl border border-border/70 bg-card/35 p-3" key={i}><Skeleton className="aspect-[16/10] w-full rounded-2xl" /><SkeletonText className="mt-4 w-24" /><Skeleton className="mt-2 h-7 w-3/4" /><SkeletonText className="mt-3 w-full" /><SkeletonText className="mt-2 w-4/5" /><Skeleton className="mt-4 h-12 w-full" /></div>)}</div></StandardSkeletonShell>;
}

export function SkeletonEmptyCard({ className }: { className?: string }) {
  return (
    <div className={cn("grid min-h-44 place-items-center rounded-2xl border border-border/70 bg-card/35 p-6 text-center", className)}>
      <div className="w-full max-w-md"><Skeleton className="mx-auto h-7 w-3/4" /><SkeletonText className="mx-auto mt-3 w-full" /><SkeletonText className="mx-auto mt-2 w-4/5" /><SkeletonButton className="mx-auto mt-5" /></div>
    </div>
  );
}

export function LocalGaragePageSkeleton() {
  return <StandardSkeletonShell><SkeletonPageHeader /><SkeletonEmptyCard className="mt-6" /></StandardSkeletonShell>;
}

export function LocalProjectFormSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6" aria-label="Carregando formulario local do projeto">
      <div className="rounded-2xl border border-border/70 bg-card/35 p-4 md:p-6"><SkeletonText className="w-20" /><Skeleton className="mt-2 h-8 w-4/5 max-w-md" /><SkeletonText className="mt-2 w-full max-w-2xl" /><SkeletonText className="mt-2 w-3/4 max-w-lg" /></div>
      <div className="grid gap-3 rounded-2xl border border-border/70 bg-card/35 p-4 md:grid-cols-2 md:gap-4 md:p-6">
        {Array.from({ length: 10 }).map((_, i) => <FormFieldSkeleton key={i} />)}
        <FormFieldSkeleton wide /><FormFieldSkeleton wide /><FormFieldSkeleton wide tall />
        <FormFieldSkeleton tall /><FormFieldSkeleton tall />
      </div>
      <div className="mobile-cta-safe flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/35 p-3 sm:flex-row sm:items-center sm:justify-between"><SkeletonText className="w-full max-w-lg" /><SkeletonButton className="w-full sm:w-48" /></div>
    </div>
  );
}

export function AccessCardSkeleton({ maxWidth = "max-w-3xl" }: { maxWidth?: string }) {
  return <StandardSkeletonShell maxWidth={maxWidth}><div className="rounded-2xl border border-border/70 bg-card/35 p-4 md:p-8"><SkeletonText className="w-24" /><Skeleton className="mt-2 h-8 w-4/5 max-w-md" /><SkeletonText className="mt-3 w-full max-w-lg" /><div className="mt-6 flex flex-col gap-2 sm:flex-row"><SkeletonButton /><SkeletonButton /></div></div></StandardSkeletonShell>;
}

export function EmptyRankingsPageSkeleton() {
  return (
    <StandardSkeletonShell>
      <section className="rounded-4xl border border-border/70 bg-card/35 p-4 md:rounded-5xl md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between"><div className="w-full max-w-3xl"><div className="flex gap-2"><Skeleton className="h-7 w-32 rounded-full" /><Skeleton className="h-7 w-36 rounded-full" /></div><Skeleton className="mt-4 h-10 w-4/5 md:h-16" /><SkeletonText className="mt-4 w-full" /><SkeletonText className="mt-2 w-3/4" /></div><div className="grid grid-cols-3 gap-2 xl:w-[28rem]">{Array.from({ length: 3 }).map((_, i) => <SkeletonMetric compact key={i} />)}</div></div>
        <div className="mt-4 flex gap-2 overflow-hidden md:mt-8">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-full" />)}</div>
        <div className="mt-6"><SkeletonText className="w-28" /><Skeleton className="mt-2 h-8 w-64" /><SkeletonText className="mt-2 w-4/5" /></div>
      </section>
      <SkeletonEmptyCard className="mt-10 min-h-[30rem]" />
    </StandardSkeletonShell>
  );
}

export function EmptyUpdatesPageSkeleton() {
  return <StandardSkeletonShell><SkeletonPageHeader /><SkeletonEmptyCard className="mt-8 min-h-52" /></StandardSkeletonShell>;
}

export function EmptyDiscoveryPageSkeleton() {
  return <StandardSkeletonShell><SkeletonPageHeader bordered /><DiscoveryBodySkeleton empty /></StandardSkeletonShell>;
}

export function EmptyComparePageSkeleton() {
  return <StandardSkeletonShell><SkeletonPageHeader action={false} /><div className="mt-8 grid gap-3 rounded-2xl border border-border/70 bg-card/35 p-5 md:grid-cols-[1fr_1fr_auto]"><Skeleton className="h-12" /><Skeleton className="h-12" /><SkeletonButton /></div><div className="mt-8 grid gap-4 lg:grid-cols-2"><Skeleton className="h-16 rounded-2xl" /><Skeleton className="h-16 rounded-2xl" /></div><section className="mt-10"><SkeletonText className="w-32" /><Skeleton className="mt-2 h-8 w-64" /><div className="mt-4 grid gap-3">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl md:h-20" />)}</div></section></StandardSkeletonShell>;
}

export function EmptyNotificationsPageSkeleton() {
  return <StandardSkeletonShell maxWidth="max-w-4xl"><SkeletonPageHeader /><div className="mt-5 rounded-2xl border border-border/70 bg-card/35 p-4 md:mt-8 md:p-8"><Skeleton className="h-8 w-4/5 max-w-md" /><SkeletonText className="mt-3 w-full max-w-lg" /><SkeletonButton className="mt-6" /></div></StandardSkeletonShell>;
}
