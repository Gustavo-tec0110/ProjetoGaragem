import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Bookmark, Heart, MapPin, Wrench } from "lucide-react";

import { CarGrid } from "@/components/garage/car-card";
import { ProfileForm } from "@/components/garage/profile-form";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { qCarsByOwner, qProfileByUsername, qSavedCars } from "@/lib/supabase/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ handle: string }>;
};

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Heart }) {
  return (
    <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
      <Icon className="size-5 text-accent" />
      <p className="mt-3 text-xs text-muted">{label}</p>
      <p className="mt-1 font-title text-2xl">{value.toLocaleString("pt-BR")}</p>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { title: "Perfil" };
  const result = await qProfileByUsername(supabase, handle);
  if (!result.data) return { title: "Perfil nao encontrado" };
  return {
    title: `${result.data.display_name} | Projeto Garagem`,
    description: result.data.bio ?? `Garagem publica de @${result.data.username}.`,
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { handle } = await params;
  const supabase = await getSupabaseServerClient();
  if (!supabase) notFound();

  const profileResult = await qProfileByUsername(supabase, handle);
  if (!profileResult.data) notFound();

  const profile = profileResult.data;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [carsResult, savedResult] = await Promise.all([
    qCarsByOwner(profile.id, user?.id === profile.id),
    profile.is_saves_public || user?.id === profile.id ? qSavedCars(profile.id) : Promise.resolve({ data: [], error: null }),
  ]);
  const cars = carsResult.data ?? [];
  const savedCars = savedResult.data ?? [];
  const totalLikes = cars.reduce((sum, car) => sum + car.likes_count, 0);
  const totalSaves = cars.reduce((sum, car) => sum + car.saves_count, 0);
  const isOwner = user?.id === profile.id;
  const location = [profile.city, profile.state].filter(Boolean).join(", ");
  const heroImage = cars[0]?.main_photo_url ?? "/ref/hero-car.jpg";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl pt-20 md:pt-24 pb-12">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0">
              <Image src={heroImage} alt="" fill priority unoptimized className="object-cover opacity-35" />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/45" />
            </div>

            <div className="relative p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted">Perfil automotivo</p>
                  <h1 className="mt-2 font-title text-3xl tracking-tight md:text-5xl">
                    {profile.display_name}
                  </h1>
                  <p className="mt-2 text-muted">@{profile.username}</p>
                  {profile.bio ? <p className="mt-4 max-w-2xl text-foreground/90">{profile.bio}</p> : null}
                  {location ? (
                    <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/35 px-4 py-2 text-sm text-muted">
                      <MapPin className="size-4 text-accent" />
                      {location}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-3 md:min-w-96">
                  <Stat label="Carros" value={cars.length} icon={Wrench} />
                  <Stat label="Curtidas" value={totalLikes} icon={Heart} />
                  <Stat label="Salvos" value={totalSaves} icon={Bookmark} />
                </div>
              </div>

              {isOwner ? (
                <div className="mt-6">
                  <Button asChild>
                    <Link href="/garagem">Editar na Minha Garagem</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>

          {isOwner ? (
            <section className="mt-8">
              <ProfileForm profile={profile} defaultEmail={user?.email} />
            </section>
          ) : null}

          <section className="mt-10">
            <div className="mb-4">
              <p className="text-xs text-muted">Garagem publica</p>
              <h2 className="mt-1 font-title text-2xl tracking-tight">Carros cadastrados</h2>
            </div>
            <CarGrid cars={cars} emptyTitle="Este usuario ainda nao cadastrou carros publicos." />
          </section>

          {(profile.is_saves_public || isOwner) && savedCars.length ? (
            <section className="mt-12">
              <div className="mb-4">
                <p className="text-xs text-muted">Salvos</p>
                <h2 className="mt-1 font-title text-2xl tracking-tight">Carros salvos</h2>
              </div>
              <CarGrid cars={savedCars} />
            </section>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
