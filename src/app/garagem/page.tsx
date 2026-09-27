import Link from "next/link";
import { Plus } from "lucide-react";

import { InspirationPlanner } from "@/components/garage/inspiration-planner";
import { ProfileExperience, type ProfileTabKey } from "@/components/garage/profile-experience";
import { ProfileForm } from "@/components/garage/profile-form";
import { LocalGaragePanel } from "@/components/projects/local-garage-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { demoProjects } from "@/lib/projects/demo-projects";
import { getSupabaseServerUser } from "@/lib/supabase/auth-server";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Minha Garagem" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function profileTab(value: string | undefined): ProfileTabKey {
  return value === "salvos" || value === "curtidos" || value === "seguindo" ? value : "projetos";
}

export default async function GaragemPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, supabase, user] = await Promise.all([
    searchParams,
    getSupabaseServerClient(),
    getSupabaseServerUser(),
  ]);

  if (!supabase) {
    return (
      <div className="min-h-screen bg-background">
        <main className="px-4 sm:px-6">
          <div className="mobile-page-shell mx-auto w-full max-w-6xl pb-12 md:pt-24">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs text-muted">Minha Garagem</p>
                <h1 className="mt-2 font-title text-3xl tracking-tight md:text-5xl">Garagem local</h1>
                <p className="mt-3 max-w-2xl text-muted">Enquanto o Supabase não está configurado, seus projetos ficam salvos neste navegador.</p>
              </div>
              <Button asChild><Link href="/criar-projeto"><Plus className="size-4" />Adicionar projeto local</Link></Button>
            </div>
            <div className="mt-6"><LocalGaragePanel /></div>
            <section className="mt-8"><InspirationPlanner mode="local" storageScope="local" inspirationProjects={demoProjects.slice(0, 8)} referenceSourceLabel="Projetos demo" /></section>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <main className="px-4 sm:px-6">
          <div className="mobile-page-shell mx-auto w-full max-w-3xl pb-12 md:pt-24">
            <Card className="p-5 md:p-8">
              <p className="text-xs text-muted">Minha Garagem</p>
              <h1 className="mt-2 font-title text-3xl tracking-tight">Entre para gerenciar seus projetos</h1>
              <p className="mt-2 text-muted">Você pode explorar projetos públicos sem conta. Para criar, curtir, salvar e comentar, entre ou crie sua conta.</p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button asChild><Link href="/login?next=/garagem">Entrar</Link></Button>
                <Button asChild variant="outline"><Link href="/explorar">Explorar projetos</Link></Button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const current = await getCurrentProfile();
  if (!current.profile) {
    return (
      <div className="min-h-screen bg-background">
        <main className="px-4 sm:px-6">
          <div className="mobile-page-shell mx-auto w-full max-w-3xl pb-12 md:pt-24"><ProfileForm defaultEmail={user.email} /></div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="px-4 sm:px-6">
        <div className="mobile-page-shell mx-auto w-full max-w-6xl pb-12 md:pt-24">
          <ProfileExperience
            profile={current.profile}
            isOwner
            viewerLoggedIn
            viewerFollows={false}
            activeTab={profileTab(firstParam(params.aba))}
            baseHref="/garagem"
            defaultEmail={user.email}
            showPrivateTools
          />
        </div>
      </main>
    </div>
  );
}
