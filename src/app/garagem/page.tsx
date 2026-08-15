import Link from "next/link";
import { Bookmark, Eye, Heart, PiggyBank, Plus, Users, Wrench, type LucideIcon } from "lucide-react";

import { CarGrid } from "@/components/garage/car-card";
import { InspirationPlanner } from "@/components/garage/inspiration-planner";
import { LocalGaragePanel } from "@/components/projects/local-garage-panel";
import { ProfileForm } from "@/components/garage/profile-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { demoProjects } from "@/lib/projects/demo-projects";
import { getProjectCollection, getProjectsBySlugs } from "@/lib/projects/server";
import { getCurrentProfile, qCarsByOwner, qFollowedCars, qLikedCars, qSavedCars } from "@/lib/supabase/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServerUser } from "@/lib/supabase/auth-server";
import { formatProjectCurrency } from "@/lib/projects/utils";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Minha Garagem",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type GarageTabKey = "projetos" | "salvos" | "curtidos" | "seguindo";

function param(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function isGarageTabKey(value: string): value is GarageTabKey {
  return value === "projetos" || value === "salvos" || value === "curtidos" || value === "seguindo";
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Heart;
}) {
  return (
    <Card className="p-3 md:p-5">
      <div className="flex items-center gap-2 md:block">
        <Icon className="size-4 shrink-0 text-accent md:size-5" />
        <p className="text-[11px] leading-tight text-muted md:mt-3 md:text-xs">{label}</p>
      </div>
      <p className="mt-2 font-title text-xl md:mt-1 md:text-3xl">{value.toLocaleString("pt-BR")}</p>
    </Card>
  );
}

function GarageTabLink({
  href,
  label,
  count,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  count: number;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        "flex min-w-max items-center justify-center gap-1.5 rounded-3xl border px-3 py-2.5 text-xs font-ui font-semibold transition md:min-w-[150px] md:gap-2 md:px-4 md:py-3 md:text-sm",
        active
          ? "border-accent/35 bg-accent/10 text-foreground shadow-glow"
          : "border-border/70 bg-background/25 text-muted hover:bg-background/45 hover:text-foreground"
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="size-4" />
      <span>{label}</span>
      <span className="rounded-full bg-background/55 px-2 py-0.5 text-[11px] text-muted">
        {count.toLocaleString("pt-BR")}
      </span>
    </Link>
  );
}

export default async function GaragemPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const requestedTab = param(params, "aba");
  const activeTabKey = isGarageTabKey(requestedTab) ? requestedTab : "projetos";
  const [supabase, user] = await Promise.all([
    getSupabaseServerClient(),
    getSupabaseServerUser(),
  ]);

  if (!supabase) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 px-4 sm:px-6">
          <div className="mobile-page-shell mx-auto w-full max-w-6xl pb-12 md:pt-24">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs text-muted">Minha Garagem</p>
                <h1 className="mt-2 font-title text-3xl tracking-tight md:text-5xl">
                  Garagem local
                </h1>
                <p className="mt-3 max-w-2xl text-muted">
                  Enquanto o Supabase nao esta configurado, seus projetos ficam salvos
                  neste navegador para validar o MVP sem interrupcao.
                </p>
              </div>
              <Button asChild>
                <Link href="/criar-projeto">
                  <Plus className="size-4" />
                  Adicionar projeto local
                </Link>
              </Button>
            </div>

            <div className="mt-5 md:mt-8">
              <LocalGaragePanel />
            </div>

            <section className="mt-7 md:mt-10">
              <InspirationPlanner
                mode="local"
                storageScope="local"
                inspirationProjects={demoProjects.slice(0, 8)}
                referenceSourceLabel="Projetos demo"
              />
            </section>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 px-4 sm:px-6">
          <div className="mobile-page-shell mx-auto w-full max-w-3xl pb-12 md:pt-24">
            <Card className="p-4 md:p-8">
              <p className="text-xs text-muted">Minha Garagem</p>
              <h1 className="mt-2 font-title text-3xl tracking-tight">
                Entre para gerenciar seus projetos
              </h1>
              <p className="mt-2 text-muted">
                Voce pode explorar projetos publicos sem conta. Para criar, curtir, salvar e comentar, entre ou crie sua conta.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button asChild>
                  <Link href="/login?next=/garagem">Entrar</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/explorar">Explorar projetos</Link>
                </Button>
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
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 px-4 sm:px-6">
          <div className="mobile-page-shell mx-auto w-full max-w-3xl pb-12 md:pt-24">
            <ProfileForm defaultEmail={user.email} />
          </div>
        </main>
      </div>
    );
  }

  const [myCarsResult, savedResult, likedResult, followedResult, catalog] = await Promise.all([
    qCarsByOwner(user.id, true),
    qSavedCars(user.id),
    qLikedCars(user.id),
    qFollowedCars(user.id),
    getProjectCollection(),
  ]);
  const myCars = myCarsResult.data ?? [];
  const savedCars = savedResult.data ?? [];
  const likedCars = likedResult.data ?? [];
  const followedCars = followedResult.data ?? [];
  const myCarSlugs = myCars.map((car) => car.slug);
  const referenceSlugs = (
    savedCars.length
      ? savedCars.map((car) => car.slug)
      : catalog.allProjects
          .filter((project) => !myCarSlugs.includes(project.slug))
          .slice(0, 12)
          .map((project) => project.slug)
  ).filter(Boolean);
  const [myProjects, referenceProjects] = await Promise.all([
    getProjectsBySlugs(myCarSlugs),
    getProjectsBySlugs(referenceSlugs),
  ]);
  const likesReceived = myCars.reduce((sum, car) => sum + car.likes_count, 0);
  const viewsReceived = myCars.reduce((sum, car) => sum + car.views_count, 0);
  const totalInvested = myCars.reduce((sum, car) => sum + (car.total_invested || car.estimated_cost || 0), 0);
  const activeProjects = myCars.filter((car) => car.project_status !== "Finalizado").length;
  const garageTabs = [
    {
      key: "projetos",
      href: "/garagem",
      label: "Meus Projetos",
      title: "Meus projetos",
      eyebrow: "Sua garagem",
      icon: Wrench,
      cars: myCars,
      emptyTitle: "Voce ainda nao cadastrou nenhum projeto.",
      emptyDescription: "Crie seu primeiro projeto para acompanhar evolucao, pecas e interacoes.",
      emptyAction: (
        <Button asChild>
          <Link href="/criar-projeto">Adicionar meu primeiro projeto</Link>
        </Button>
      ),
    },
    {
      key: "salvos",
      href: "/garagem?aba=salvos",
      label: "Salvos",
      title: "Projetos salvos",
      eyebrow: "Referencias",
      icon: Bookmark,
      cars: savedCars,
      emptyTitle: "Voce ainda nao salvou nenhum projeto.",
      emptyDescription: "Explore projetos e salve os que voce quer consultar depois.",
      emptyAction: (
        <Button asChild>
          <Link href="/explorar">Explorar projetos</Link>
        </Button>
      ),
    },
    {
      key: "curtidos",
      href: "/garagem?aba=curtidos",
      label: "Curtidos",
      title: "Projetos curtidos",
      eyebrow: "Curtidas",
      icon: Heart,
      cars: likedCars,
      emptyTitle: "Voce ainda nao curtiu nenhum projeto.",
      emptyDescription: "Curta projetos para encontra-los facilmente aqui.",
      emptyAction: (
        <Button asChild>
          <Link href="/explorar">Explorar projetos</Link>
        </Button>
      ),
    },
    {
      key: "seguindo",
      href: "/garagem?aba=seguindo",
      label: "Seguindo",
      title: "Projetos seguindo",
      eyebrow: "Acompanhando",
      icon: Users,
      cars: followedCars,
      emptyTitle: "Voce ainda nao segue nenhum projeto.",
      emptyDescription: "Siga projetos para acompanhar novidades e atualizacoes.",
      emptyAction: (
        <Button asChild>
          <Link href="/explorar">Explorar projetos</Link>
        </Button>
      ),
    },
  ] as const;
  const activeTab = garageTabs.find((tab) => tab.key === activeTabKey) ?? garageTabs[0];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 px-4 sm:px-6">
        <div className="mobile-page-shell mx-auto w-full max-w-6xl pb-12 md:pt-24">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs text-muted">Minha Garagem</p>
              <h1 className="mt-1 font-title text-2xl tracking-tight md:mt-2 md:text-5xl">
                {current.profile.display_name}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted md:mt-3 md:text-base">
                Hub logado para gerenciar seus projetos, acompanhar interacoes e acessar salvos.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row">
              <Button asChild variant="outline">
                <Link href={`/perfil/${current.profile.username}`}>Ver perfil publico</Link>
              </Button>
              <Button asChild>
                <Link href="/criar-projeto">
                  <Plus className="size-4" />
                  Adicionar projeto
                </Link>
              </Button>
            </div>
          </div>

          <section className="mt-5 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-4 lg:grid-cols-5">
            <Stat label="Projetos cadastrados" value={myCars.length} icon={Wrench} />
            <Stat label="Curtidas recebidas" value={likesReceived} icon={Heart} />
            <Stat label="Views totais" value={viewsReceived} icon={Eye} />
            <Card className="p-3 md:p-5">
              <div className="flex items-center gap-2 md:block">
                <PiggyBank className="size-4 shrink-0 text-accent md:size-5" />
                <p className="text-[11px] leading-tight text-muted md:mt-3 md:text-xs">Total investido</p>
              </div>
              <p className="mt-2 truncate font-title text-xl md:mt-1 md:text-3xl">{formatProjectCurrency(totalInvested)}</p>
            </Card>
            <Stat label="Projetos ativos" value={activeProjects} icon={Wrench} />
          </section>

          <section className="mt-7 md:mt-10">
            <div className="mb-3 flex items-end justify-between gap-3 md:mb-4 lg:items-end">
              <div>
                <p className="text-xs text-muted">Hub do usuario</p>
                <h2 className="mt-1 font-title text-2xl tracking-tight">Minha Garagem</h2>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0 px-3">
                <Link href="/criar-projeto">Adicionar projeto</Link>
              </Button>
            </div>
            <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 md:mb-6" role="tablist" aria-label="Navegacao da garagem">
              {garageTabs.map((tab) => (
                <GarageTabLink
                  key={tab.key}
                  href={tab.href}
                  label={tab.label}
                  count={tab.cars.length}
                  icon={tab.icon}
                  active={tab.key === activeTab.key}
                />
              ))}
            </div>
            <div className="mb-4">
              <p className="text-xs text-muted">{activeTab.eyebrow}</p>
              <h3 className="mt-1 font-title text-xl tracking-tight">{activeTab.title}</h3>
            </div>
            <CarGrid
              cars={activeTab.cars}
              emptyTitle={activeTab.emptyTitle}
              emptyDescription={activeTab.emptyDescription}
              emptyAction={activeTab.emptyAction}
            />
          </section>

          <section className="mt-7 md:mt-10">
            <InspirationPlanner
              mode="supabase"
              storageScope={user.id}
              currentProjects={myProjects}
              inspirationProjects={referenceProjects}
              referenceSourceLabel={savedCars.length ? "Projetos salvos" : "Projetos em destaque"}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
