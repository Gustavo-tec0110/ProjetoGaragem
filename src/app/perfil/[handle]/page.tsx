import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Eye, Heart, MapPin, Wrench } from "lucide-react";

import { FollowProfileButton } from "@/components/garage/follow-profile-button";
import { CarGrid } from "@/components/garage/car-card";
import { ProfileForm } from "@/components/garage/profile-form";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSeoMetadata } from "@/lib/seo";
import {
  qCarsByOwner,
  qFollowedCars,
  qLikedCars,
  qProfileByUsername,
  qSavedCars,
  qViewerFollowsProfile,
} from "@/lib/supabase/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatProjectCurrency } from "@/lib/projects/utils";

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
  if (!supabase) return createSeoMetadata({ title: "Perfil", path: `/perfil/${handle}` });
  const result = await qProfileByUsername(supabase, handle);
  if (!result.data) {
    return createSeoMetadata({
      title: "Perfil nao encontrado",
      description: "O perfil publico solicitado nao foi encontrado.",
      path: `/perfil/${handle}`,
    });
  }
  return createSeoMetadata({
    title: result.data.display_name,
    description: result.data.bio ?? `Garagem publica de @${result.data.username}.`,
    path: `/perfil/${handle}`,
    canonicalPath: `/perfil/${handle}`,
    image: result.data.avatar_url,
    type: "profile",
  });
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
  const [carsResult, savedResult, likedResult, followedCarsResult, followingResult] = await Promise.all([
    qCarsByOwner(profile.id, user?.id === profile.id),
    profile.is_saves_public || user?.id === profile.id ? qSavedCars(profile.id) : Promise.resolve({ data: [], error: null }),
    profile.is_likes_public || user?.id === profile.id ? qLikedCars(profile.id) : Promise.resolve({ data: [], error: null }),
    qFollowedCars(profile.id),
    user?.id && user.id !== profile.id ? qViewerFollowsProfile(profile.id) : Promise.resolve({ data: false, error: null }),
  ]);
  const cars = carsResult.data ?? [];
  const savedCars = savedResult.data ?? [];
  const likedCars = likedResult.data ?? [];
  const followedCars = followedCarsResult.data ?? [];
  const viewerFollows = followingResult.data ?? false;
  const totalLikes = cars.reduce((sum, car) => sum + car.likes_count, 0);
  const totalViews = cars.reduce((sum, car) => sum + car.views_count, 0);
  const totalInvested = cars.reduce((sum, car) => sum + (car.total_invested || car.estimated_cost || 0), 0);
  const activeProjects = cars.filter((car) => car.project_status !== "Finalizado").length;
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
                  <div className="mb-5 flex items-center gap-4">
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.display_name}
                        width={88}
                        height={88}
                        unoptimized
                        className="size-20 rounded-full border border-border/70 object-cover md:size-24"
                      />
                    ) : (
                      <div className="flex size-20 items-center justify-center rounded-full border border-border/70 bg-background/35 font-title text-2xl md:size-24">
                        {profile.display_name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted">Perfil automotivo</p>
                      <h1 className="mt-2 font-title text-3xl tracking-tight md:text-5xl">
                        {profile.display_name}
                      </h1>
                      <p className="mt-2 text-muted">@{profile.username}</p>
                    </div>
                  </div>
                  {profile.bio ? <p className="mt-4 max-w-2xl text-foreground/90">{profile.bio}</p> : null}
                  {location ? (
                    <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/35 px-4 py-2 text-sm text-muted">
                      <MapPin className="size-4 text-accent" />
                      {location}
                    </p>
                  ) : null}
                  {profile.instagram_handle ? (
                    <p className="mt-4 text-sm text-muted">
                      Instagram:{" "}
                      <a
                        href={`https://instagram.com/${profile.instagram_handle.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-foreground"
                      >
                        @{profile.instagram_handle.replace(/^@/, "")}
                      </a>
                    </p>
                  ) : null}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {isOwner ? (
                      <Button asChild>
                        <Link href="/criar-projeto">Criar novo projeto</Link>
                      </Button>
                    ) : (
                      <FollowProfileButton
                        profileId={profile.id}
                        initialFollowing={viewerFollows}
                        viewerLoggedIn={Boolean(user)}
                      />
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 md:min-w-[28rem]">
                  <Stat label="Carros" value={cars.length} icon={Wrench} />
                  <Stat label="Curtidas" value={totalLikes} icon={Heart} />
                  <Stat label="Views" value={totalViews} icon={Eye} />
                  <Stat label="Seguidores" value={profile.followers_count} icon={Heart} />
                  <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                    <p className="text-xs text-muted">Total investido</p>
                    <p className="mt-1 font-title text-2xl">
                      {formatProjectCurrency(totalInvested)}
                    </p>
                  </div>
                  <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                    <p className="text-xs text-muted">Projetos ativos</p>
                    <p className="mt-1 font-title text-2xl">
                      {activeProjects.toLocaleString("pt-BR")}
                    </p>
                  </div>
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

          {(profile.is_likes_public || isOwner) && likedCars.length ? (
            <section className="mt-12">
              <div className="mb-4">
                <p className="text-xs text-muted">Curtidos</p>
                <h2 className="mt-1 font-title text-2xl tracking-tight">Projetos curtidos</h2>
              </div>
              <CarGrid cars={likedCars} />
            </section>
          ) : null}

          {followedCars.length ? (
            <section className="mt-12">
              <div className="mb-4">
                <p className="text-xs text-muted">Acompanhando</p>
                <h2 className="mt-1 font-title text-2xl tracking-tight">Projetos que segue</h2>
              </div>
              <CarGrid cars={followedCars} />
            </section>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
