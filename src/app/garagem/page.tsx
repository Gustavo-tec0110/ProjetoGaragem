import Link from "next/link";
import { Bookmark, Heart, MessageCircle, Plus, Wrench } from "lucide-react";

import { CarGrid } from "@/components/garage/car-card";
import { ProfileForm } from "@/components/garage/profile-form";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentProfile, qCarsByOwner, qSavedCars } from "@/lib/supabase/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Minha Garagem",
};

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
    <Card className="p-5">
      <Icon className="size-5 text-accent" />
      <p className="mt-3 text-xs text-muted">{label}</p>
      <p className="mt-1 font-title text-3xl">{value.toLocaleString("pt-BR")}</p>
    </Card>
  );
}

export default async function GaragemPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!supabase) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteNavbar />
        <main className="flex-1 px-4 sm:px-6">
          <div className="mx-auto w-full max-w-6xl pt-20 md:pt-24 pb-12">
            <Card className="p-6 md:p-8">
              <h1 className="font-title text-2xl tracking-tight">Configure o Supabase</h1>
              <p className="mt-2 text-sm text-muted">
                A garagem precisa de banco configurado para salvar carros e interacoes.
              </p>
            </Card>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteNavbar />
        <main className="flex-1 px-4 sm:px-6">
          <div className="mx-auto w-full max-w-3xl pt-20 md:pt-24 pb-12">
            <Card className="p-6 md:p-8">
              <p className="text-xs text-muted">Minha Garagem</p>
              <h1 className="mt-2 font-title text-3xl tracking-tight">
                Entre para gerenciar seus carros
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
        <SiteFooter />
      </div>
    );
  }

  const current = await getCurrentProfile();
  if (!current.profile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteNavbar />
        <main className="flex-1 px-4 sm:px-6">
          <div className="mx-auto w-full max-w-3xl pt-20 md:pt-24 pb-12">
            <ProfileForm defaultEmail={user.email} />
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const [myCarsResult, savedResult] = await Promise.all([
    qCarsByOwner(user.id, true),
    qSavedCars(user.id),
  ]);
  const myCars = myCarsResult.data ?? [];
  const savedCars = savedResult.data ?? [];
  const likesReceived = myCars.reduce((sum, car) => sum + car.likes_count, 0);
  const savesReceived = myCars.reduce((sum, car) => sum + car.saves_count, 0);
  const commentsReceived = myCars.reduce((sum, car) => sum + car.comments_count, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl pt-20 md:pt-24 pb-12">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs text-muted">Minha Garagem</p>
              <h1 className="mt-2 font-title text-3xl tracking-tight md:text-5xl">
                {current.profile.display_name}
              </h1>
              <p className="mt-3 max-w-2xl text-muted">
                Hub logado para gerenciar seus carros, acompanhar interacoes e acessar salvos.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline">
                <Link href={`/perfil/${current.profile.username}`}>Ver perfil publico</Link>
              </Button>
              <Button asChild>
                <Link href="/carros/novo">
                  <Plus className="size-4" />
                  Adicionar carro
                </Link>
              </Button>
            </div>
          </div>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Carros cadastrados" value={myCars.length} icon={Wrench} />
            <Stat label="Curtidas recebidas" value={likesReceived} icon={Heart} />
            <Stat label="Salvos recebidos" value={savesReceived} icon={Bookmark} />
            <Stat label="Comentarios recebidos" value={commentsReceived} icon={MessageCircle} />
          </section>

          <section className="mt-10">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-muted">Seus projetos</p>
                <h2 className="mt-1 font-title text-2xl tracking-tight">Meus carros</h2>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/carros/novo">Adicionar</Link>
              </Button>
            </div>
            <CarGrid
              cars={myCars}
              emptyTitle="Voce ainda nao cadastrou nenhum carro."
              emptyAction={
                <Button asChild>
                  <Link href="/carros/novo">Adicionar meu primeiro carro</Link>
                </Button>
              }
            />
          </section>

          <section className="mt-12">
            <div className="mb-4">
              <p className="text-xs text-muted">Referencias</p>
              <h2 className="mt-1 font-title text-2xl tracking-tight">Carros salvos</h2>
            </div>
            <CarGrid cars={savedCars} emptyTitle="Nenhum carro salvo ainda." />
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
