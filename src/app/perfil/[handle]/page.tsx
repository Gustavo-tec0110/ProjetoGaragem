import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Clock,
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  TrendingUp,
  UserCheck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { FollowProfileButton } from "@/components/garage/follow-profile-button";
import { CarGrid } from "@/components/garage/car-card";
import { ProfileForm } from "@/components/garage/profile-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProfileContentSkeleton } from "@/components/ui/page-skeletons";
import { createSeoMetadata } from "@/lib/seo";
import {
  qCarsByOwner,
  qFollowedCars,
  qLikedCars,
  qProfileById,
  qPublicProfileByUsername,
  qSavedCars,
  qViewerFollowsProfile,
} from "@/lib/supabase/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServerUser } from "@/lib/supabase/auth-server";
import { formatProjectCurrency } from "@/lib/projects/utils";
import type { ProfileRow } from "@/lib/types";

type PageProps = {
  params: Promise<{ handle: string }>;
};

function Stat({ label, value, icon: Icon }: { label: string; value: number | string; icon: LucideIcon }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-background/25 p-3 md:rounded-4xl md:p-4">
      <div className="flex items-center gap-2 md:block">
        <Icon className="size-4 shrink-0 text-accent md:size-5" />
        <p className="text-[11px] leading-tight text-muted md:mt-3 md:text-xs">{label}</p>
      </div>
      <p className="mt-2 break-words font-title text-lg leading-tight sm:text-xl md:mt-1 md:text-2xl">
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </p>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const result = await qPublicProfileByUsername(handle);
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

function PublicProfilePreview({ profile }: { profile: ProfileRow }) {
  const location = [profile.city, profile.state].filter(Boolean).join(", ");

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Image src="/ref/hero-car.jpg" alt="" fill priority className="object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/45" />
      </div>
      <div className="relative p-4 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_28rem]">
          <div className="min-w-0">
            <div className="flex items-center gap-3 md:gap-4">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  width={96}
                  height={96}
                  priority
                  unoptimized
                  className="size-16 rounded-full border border-border/70 object-cover md:size-24"
                />
              ) : (
                <div className="flex size-16 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/35 font-title text-xl md:size-24 md:text-2xl">
                  {profile.display_name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-xs text-muted">Perfil automotivo</p>
                <h1 className="mt-1 font-title text-2xl tracking-tight md:mt-2 md:text-5xl">{profile.display_name}</h1>
                <p className="mt-1 text-sm text-muted md:mt-2 md:text-base">@{profile.username}</p>
              </div>
            </div>
            {profile.bio ? <p className="mt-4 max-w-2xl text-sm text-foreground/90 md:text-base">{profile.bio}</p> : null}
            {location ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/35 px-3 py-2 text-xs text-muted md:px-4 md:text-sm">
                <MapPin className="size-4 text-accent" />
                {location}
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <Stat label="Projetos" value={profile.cars_count} icon={Wrench} />
            <Stat label="Seguidores" value={profile.followers_count} icon={Users} />
            <Stat label="Seguindo" value={profile.following_count} icon={UserCheck} />
          </div>
        </div>
      </div>
    </Card>
  );
}

async function PublicProfileRouteContent({ handle }: { handle: string }) {
  const profileResult = await qPublicProfileByUsername(handle);
  if (!profileResult.data) notFound();

  return (
    <Suspense fallback={<PublicProfilePreview profile={profileResult.data} />}>
      <PublicProfileDetails profile={profileResult.data} />
    </Suspense>
  );
}

async function PublicProfileDetails({ profile: publicProfile }: { profile: ProfileRow }) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) notFound();
  const user = await getSupabaseServerUser();
  const isOwner = user?.id === publicProfile.id;
  const ownProfileResult = isOwner ? await qProfileById(supabase, publicProfile.id) : null;
  const profile = ownProfileResult?.data ?? publicProfile;
  const [carsResult, savedResult, likedResult, followedCarsResult, followingResult] = await Promise.all([
    qCarsByOwner(profile.id, isOwner),
    profile.is_saves_public || isOwner ? qSavedCars(profile.id) : Promise.resolve({ data: [], error: null }),
    profile.is_likes_public || isOwner ? qLikedCars(profile.id) : Promise.resolve({ data: [], error: null }),
    isOwner ? qFollowedCars(profile.id) : Promise.resolve({ data: [], error: null }),
    user?.id && user.id !== profile.id ? qViewerFollowsProfile(profile.id) : Promise.resolve({ data: false, error: null }),
  ]);
  const cars = carsResult.data ?? [];
  const savedCars = savedResult.data ?? [];
  const likedCars = likedResult.data ?? [];
  const followedCars = followedCarsResult.data ?? [];
  const viewerFollows = followingResult.data ?? false;
  const totalLikes = cars.reduce((sum, car) => sum + car.likes_count, 0);
  const totalViews = cars.reduce((sum, car) => sum + car.views_count, 0);
  const totalComments = cars.reduce((sum, car) => sum + car.comments_count, 0);
  const totalInvested = cars.reduce((sum, car) => sum + (car.total_invested || car.estimated_cost || 0), 0);
  const activeProjects = cars.filter((car) => car.project_status !== "Finalizado").length;
  const location = [profile.city, profile.state].filter(Boolean).join(", ");
  const heroImage = cars[0]?.main_photo_url ?? "/ref/hero-car.jpg";
  const recentCars = cars.slice(0, 3);
  const popularCars = [...cars]
    .sort(
      (left, right) =>
        right.likes_count +
        right.comments_count * 2 +
        right.views_count * 0.08 +
        right.project_followers_count * 3 -
        (left.likes_count +
          left.comments_count * 2 +
          left.views_count * 0.08 +
          left.project_followers_count * 3)
    )
    .slice(0, 3);

  return (
    <>
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0">
              <Image src={heroImage} alt="" fill priority unoptimized className="object-cover opacity-35" />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/45" />
            </div>

            <div className="relative p-4 md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
                <div className="min-w-0">
                  <div className="mb-3 flex items-center gap-3 md:mb-5 md:gap-4">
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.display_name}
                        width={88}
                        height={88}
                        unoptimized
                        className="size-16 rounded-full border border-border/70 object-cover md:size-24"
                      />
                    ) : (
                      <div className="flex size-16 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/35 font-title text-xl md:size-24 md:text-2xl">
                        {profile.display_name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted">Perfil automotivo</p>
                      <h1 className="mt-1 font-title text-2xl tracking-tight md:mt-2 md:text-5xl">
                        {profile.display_name}
                      </h1>
                      <p className="mt-1 text-sm text-muted md:mt-2 md:text-base">@{profile.username}</p>
                    </div>
                  </div>
                  {profile.bio ? <p className="mt-2 max-w-2xl text-sm text-foreground/90 md:mt-4 md:text-base">{profile.bio}</p> : null}
                  {location ? (
                    <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/35 px-3 py-2 text-xs text-muted md:mt-4 md:px-4 md:text-sm">
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
                  <div className="mt-3 flex flex-wrap gap-2 md:mt-5">
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

                <div className="grid grid-cols-2 gap-2 md:min-w-[28rem] md:gap-3">
                  <Stat label="Projetos" value={cars.length} icon={Wrench} />
                  <Stat label="Curtidas recebidas" value={totalLikes} icon={Heart} />
                  <Stat label="Comentarios recebidos" value={totalComments} icon={MessageCircle} />
                  <Stat label="Visualizacoes" value={totalViews} icon={Eye} />
                  <Stat label="Seguidores" value={profile.followers_count} icon={Users} />
                  <Stat label="Seguindo" value={profile.following_count} icon={UserCheck} />
                  <Stat label="Total investido" value={formatProjectCurrency(totalInvested)} icon={TrendingUp} />
                  <Stat label="Projetos ativos" value={activeProjects} icon={Clock} />
                </div>
              </div>

              {isOwner ? (
                <div className="mt-4 md:mt-6">
                  <Button asChild>
                    <Link href="/garagem">Editar na Minha Garagem</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>

          {isOwner ? (
            <section className="mt-6 md:mt-8">
              <ProfileForm profile={profile} defaultEmail={user?.email} />
            </section>
          ) : null}

          <section className="mt-7 md:mt-10">
            <div className="mb-4">
              <p className="text-xs text-muted">Garagem publica</p>
              <h2 className="mt-1 font-title text-2xl tracking-tight">Destaques da garagem</h2>
            </div>
            {cars.length ? (
              <div className="space-y-7 md:space-y-10">
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <Clock className="size-5 text-accent" />
                    <h3 className="font-title text-xl tracking-tight">Projetos recentes</h3>
                  </div>
                  <CarGrid cars={recentCars} />
                </div>
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <TrendingUp className="size-5 text-accent" />
                    <h3 className="font-title text-xl tracking-tight">Projetos populares</h3>
                  </div>
                  <CarGrid cars={popularCars} />
                </div>
              </div>
            ) : (
              <CarGrid cars={cars} emptyTitle="Este usuario ainda nao cadastrou projetos publicos." />
            )}
          </section>

          {cars.length ? (
            <section className="mt-8 md:mt-12">
              <div className="mb-4">
                <p className="text-xs text-muted">Todos os projetos</p>
                <h2 className="mt-1 font-title text-2xl tracking-tight">Garagem completa</h2>
              </div>
              <CarGrid cars={cars} />
            </section>
          ) : null}

          {(profile.is_saves_public || isOwner) && savedCars.length ? (
            <section className="mt-8 md:mt-12">
              <div className="mb-4">
                <p className="text-xs text-muted">Salvos</p>
                <h2 className="mt-1 font-title text-2xl tracking-tight">Carros salvos</h2>
              </div>
              <CarGrid cars={savedCars} />
            </section>
          ) : null}

          {(profile.is_likes_public || isOwner) && likedCars.length ? (
            <section className="mt-8 md:mt-12">
              <div className="mb-4">
                <p className="text-xs text-muted">Curtidos</p>
                <h2 className="mt-1 font-title text-2xl tracking-tight">Projetos curtidos</h2>
              </div>
              <CarGrid cars={likedCars} />
            </section>
          ) : null}

          {followedCars.length ? (
            <section className="mt-8 md:mt-12">
              <div className="mb-4">
                <p className="text-xs text-muted">Acompanhando</p>
                <h2 className="mt-1 font-title text-2xl tracking-tight">Projetos que segue</h2>
              </div>
              <CarGrid cars={followedCars} />
            </section>
          ) : null}
    </>
  );
}

export default function PublicProfilePage({ params }: PageProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 px-4 sm:px-6">
        <div className="mobile-page-shell mx-auto w-full max-w-6xl pb-12 md:pt-24">
          <Suspense fallback={<ProfileContentSkeleton />}>
            {params.then(({ handle }) => <PublicProfileRouteContent handle={handle} />)}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
