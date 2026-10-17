import type { ComponentType } from "react";
import { notFound } from "next/navigation";

import LoadingProjectPage from "@/app/projeto/[slug]/loading";
import {
  ComparePageSkeleton,
  DiscoveryPageSkeleton,
  EvolutionPageSkeleton,
  GaragePageSkeleton,
  ModificationsPageSkeleton,
  NotificationsPageSkeleton,
  ProfileFormSkeleton,
  ProfilePageSkeleton,
  ProjectFormSkeleton,
  RankingsPageSkeleton,
  StandardSkeletonShell,
  UpdatesPageSkeleton,
} from "@/components/ui/page-skeletons";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

const skeletons: Record<string, ComponentType> = {
  atualizacoes: UpdatesPageSkeleton,
  comparar: ComparePageSkeleton,
  explorar: DiscoveryPageSkeleton,
  garagem: GaragePageSkeleton,
  notificacoes: NotificationsPageSkeleton,
  perfil: ProfilePageSkeleton,
  projeto: LoadingProjectPage,
  rankings: RankingsPageSkeleton,
  evolucao: EvolutionPageSkeleton,
  modificacoes: ModificationsPageSkeleton,
  "criar-projeto": () => <StandardSkeletonShell maxWidth="max-w-5xl"><ProjectFormSkeleton /></StandardSkeletonShell>,
  "editar-projeto": () => <StandardSkeletonShell maxWidth="max-w-5xl"><ProjectFormSkeleton /></StandardSkeletonShell>,
  "formulario-perfil": () => <StandardSkeletonShell maxWidth="max-w-3xl"><ProfileFormSkeleton /></StandardSkeletonShell>,
};

export default async function SkeletonPreviewPage({ params }: { params: Promise<{ name: string }> }) {
  if (process.env.NODE_ENV !== "development" && process.env.SKELETON_VISUAL_TEST !== "1") notFound();
  const { name } = await params;
  const Preview = skeletons[name];
  if (!Preview) notFound();
  return <div className="min-h-screen flex flex-col bg-background"><Preview /></div>;
}
