import type { ComponentType } from "react";
import { notFound } from "next/navigation";

import LoadingUpdatesPage from "@/app/atualizacoes/loading";
import LoadingComparePage from "@/app/comparar/loading";
import LoadingCreateProjectPage from "@/app/criar-projeto/loading";
import LoadingExplorePage from "@/app/explorar/loading";
import LoadingGaragePage from "@/app/garagem/loading";
import LoadingNotificationsPage from "@/app/notificacoes/loading";
import LoadingOnboardingPage from "@/app/onboarding/loading";
import LoadingRankingsPage from "@/app/rankings/loading";
import LoadingProjectPage from "@/app/projeto/[slug]/loading";
import {
  EvolutionPageSkeleton,
  ModificationsPageSkeleton,
  ProfilePageSkeleton,
  ProjectFormSkeleton,
  StandardSkeletonShell,
} from "@/components/ui/page-skeletons";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

const skeletons: Record<string, ComponentType> = {
  atualizacoes: LoadingUpdatesPage,
  comparar: LoadingComparePage,
  explorar: LoadingExplorePage,
  garagem: LoadingGaragePage,
  notificacoes: LoadingNotificationsPage,
  perfil: ProfilePageSkeleton,
  projeto: LoadingProjectPage,
  rankings: LoadingRankingsPage,
  evolucao: EvolutionPageSkeleton,
  modificacoes: ModificationsPageSkeleton,
  "criar-projeto": LoadingCreateProjectPage,
  "editar-projeto": () => <StandardSkeletonShell maxWidth="max-w-5xl"><ProjectFormSkeleton /></StandardSkeletonShell>,
  "formulario-perfil": LoadingOnboardingPage,
};

export default async function SkeletonPreviewPage({ params }: { params: Promise<{ name: string }> }) {
  if (process.env.NODE_ENV !== "development" && process.env.SKELETON_VISUAL_TEST !== "1") notFound();
  const { name } = await params;
  const Preview = skeletons[name];
  if (!Preview) notFound();
  return <div className="min-h-screen flex flex-col bg-background"><Preview /></div>;
}
