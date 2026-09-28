import Link from "next/link";
import {
  Bookmark,
  CarFront,
  Heart,
  AtSign,
  CirclePlay,
  MapPin,
  Music2,
  Plus,
  UserCheck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { CarGrid } from "@/components/garage/car-card";
import { EditProfileDialog } from "@/components/garage/edit-profile-dialog";
import { ProfileSaveFeedback } from "@/components/garage/profile-save-feedback";
import { FollowProfileButton } from "@/components/garage/follow-profile-button";
import { InspirationPlanner } from "@/components/garage/inspiration-planner";
import { ProjectImage } from "@/components/projects/project-image";
import { Button } from "@/components/ui/button";
import {
  getProfileSocialLinks,
  SOCIAL_PLATFORMS,
  socialPlatformLabel,
  type SocialPlatform,
} from "@/lib/profile/social-links";
import { Card } from "@/components/ui/card";
import { getProjectCollection, getProjectsBySlugs } from "@/lib/projects/server";
import {
  qCarsByOwner,
  qFollowingProfiles,
  qLikedCars,
  qSavedCars,
  type ProfileSummary,
} from "@/lib/supabase/queries";
import type { ProfileRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ProfileTabKey = "projetos" | "salvos" | "curtidos" | "seguindo";

type ProfileExperienceProps = {
  profile: ProfileRow;
  isOwner: boolean;
  viewerLoggedIn: boolean;
  viewerFollows: boolean;
  activeTab: ProfileTabKey;
  baseHref: string;
  defaultEmail?: string | null;
  showPrivateTools?: boolean;
};

const socialIcons: Record<SocialPlatform, LucideIcon> = {
  instagram: AtSign,
  tiktok: Music2,
  youtube: CirclePlay,
};

function ProfileStat({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <div className="flex min-h-20 flex-col items-center justify-center rounded-xl border border-border/65 bg-background/45 px-2 py-3 text-center shadow-inset">
      <Icon className="size-4 text-accent" aria-hidden="true" />
      <strong className="mt-1 font-title text-lg leading-none sm:text-xl">{value.toLocaleString("pt-BR")}</strong>
      <span className="mt-1 text-[10px] text-muted sm:text-xs">{label}</span>
    </div>
  );
}

export function ProfileHeader({
  profile,
  isOwner,
  viewerLoggedIn,
  viewerFollows,
  coverImage,
  projectsCount,
  likesReceived,
  defaultEmail,
}: {
  profile: ProfileRow;
  isOwner: boolean;
  viewerLoggedIn: boolean;
  viewerFollows: boolean;
  coverImage: string | null;
  projectsCount: number;
  likesReceived: number;
  defaultEmail?: string | null;
}) {
  const location = [profile.city, profile.state].filter(Boolean).join(" - ");
  const socialLinks = getProfileSocialLinks(profile.social_links, profile.instagram_handle);

  return (
    <Card className="relative overflow-visible rounded-2xl border-border/70 bg-card/85 shadow-soft">
      <div className="relative h-36 overflow-hidden rounded-t-2xl bg-[radial-gradient(circle_at_22%_0%,rgba(255,53,47,0.20),transparent_36%),linear-gradient(135deg,#17191f,#090a0d_70%)] sm:h-48 lg:h-56">
        {coverImage ? (
          <ProjectImage src={coverImage} alt={`Capa do perfil de ${profile.display_name}`} fill priority className="object-cover" sizes="(min-width: 1280px) 1152px, 100vw" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-black/20 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-card to-transparent" />
        {isOwner ? (
          <EditProfileDialog profile={profile} defaultEmail={defaultEmail} trigger="cover" className="absolute right-3 top-3 sm:right-4 sm:top-4" />
        ) : null}
      </div>

      <div className="relative px-4 pb-5 sm:px-6 sm:pb-6 lg:px-8">
        <div className="-mt-10 flex flex-col gap-5 sm:-mt-12 lg:grid lg:grid-cols-[1fr_23rem] lg:items-end lg:gap-8">
          <div className="min-w-0">
            <div className="relative w-fit">
              <div className="relative size-24 overflow-hidden rounded-full border-[3px] border-card bg-surface shadow-xl sm:size-28 lg:size-32">
                {profile.avatar_url ? (
                  <ProjectImage src={profile.avatar_url} alt={profile.display_name} fill priority className="object-cover" sizes="128px" />
                ) : (
                  <div className="flex size-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(255,53,47,0.20),transparent_48%)] font-title text-3xl font-semibold">
                    {profile.display_name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              {isOwner ? (
                <EditProfileDialog profile={profile} defaultEmail={defaultEmail} trigger="avatar" className="absolute -bottom-1 -right-1" />
              ) : null}
            </div>

            <div className="mt-3 min-w-0">
              <h1 className="truncate font-title text-2xl font-semibold tracking-tight sm:text-3xl">{profile.display_name}</h1>
              <p className="mt-0.5 text-sm text-muted">@{profile.username}</p>
              {profile.bio ? <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/80">{profile.bio}</p> : null}
              {(location || Object.keys(socialLinks).length) ? (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted sm:text-sm">
                  {location ? <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden="true" />{location}</span> : null}
                  {SOCIAL_PLATFORMS.flatMap((platform) => {
                    const href = socialLinks[platform];
                    if (!href) return [];
                    const Icon = socialIcons[platform];
                    const label = socialPlatformLabel(platform);
                    return [
                      <a
                        key={platform}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Abrir ${label} de ${profile.display_name}`}
                        title={label}
                        className="inline-flex size-11 items-center justify-center rounded-full border border-border/70 bg-background/45 text-foreground transition hover:border-accent/60 hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                      >
                        <Icon className="size-4" aria-hidden="true" />
                      </a>,
                    ];
                  })}
                </div>
              ) : null}
            </div>
          </div>

          <div className="lg:pb-1">
            <div className="grid grid-cols-4 gap-2">
              <ProfileStat label="Projetos" value={projectsCount} icon={CarFront} />
              <ProfileStat label="Curtidas" value={likesReceived} icon={Heart} />
              <ProfileStat label="Seguidores" value={profile.followers_count} icon={Users} />
              <ProfileStat label="Seguindo" value={profile.following_count} icon={UserCheck} />
            </div>
            <div className="mt-3 flex justify-end">
              {isOwner ? (
                <EditProfileDialog profile={profile} defaultEmail={defaultEmail} />
              ) : (
                <FollowProfileButton profileId={profile.id} initialFollowing={viewerFollows} viewerLoggedIn={viewerLoggedIn} />
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ProfileTabs({
  tabs,
  activeTab,
}: {
  tabs: Array<{ key: ProfileTabKey; label: string; href: string; icon: LucideIcon }>;
  activeTab: ProfileTabKey;
}) {
  return (
    <nav className="mt-4 border-b border-border/70" aria-label="Conteúdo do perfil">
      <div className="-mx-2 flex overflow-x-auto px-2" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.key === activeTab;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              scroll={false}
              role="tab"
              aria-selected={active}
              className={cn(
                "relative flex min-w-max items-center gap-2 px-4 py-3 font-ui text-xs font-semibold transition sm:px-6 sm:text-sm",
                active ? "text-foreground" : "text-muted hover:text-foreground"
              )}
            >
              <Icon className={cn("size-4", active && "text-accent")} aria-hidden="true" />
              {tab.label}
              {active ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent shadow-glow" /> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function FollowingGrid({ profiles, isOwner }: { profiles: ProfileSummary[]; isOwner: boolean }) {
  if (!profiles.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-background/20 p-6 text-center sm:p-8">
        <h3 className="font-title text-xl tracking-tight">{isOwner ? "Você ainda não segue nenhuma garagem." : "Nenhuma garagem disponível."}</h3>
        {isOwner ? <p className="mt-2 text-sm text-muted">Explore a comunidade e acompanhe os perfis que inspiram seus projetos.</p> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {profiles.map((followedProfile) => (
        <Link key={followedProfile.id} href={`/perfil/${followedProfile.username}`} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/70 p-3 transition hover:border-foreground/15 hover:bg-card">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-full border border-border/70 bg-surface">
            {followedProfile.avatar_url ? (
              <ProjectImage src={followedProfile.avatar_url} alt={followedProfile.display_name} fill className="object-cover" sizes="48px" />
            ) : (
              <span className="flex size-full items-center justify-center font-title text-lg">{followedProfile.display_name.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <span className="min-w-0"><strong className="block truncate text-sm">{followedProfile.display_name}</strong><span className="block truncate text-xs text-muted">@{followedProfile.username}</span></span>
        </Link>
      ))}
    </div>
  );
}

export async function ProfileExperience({
  profile,
  isOwner,
  viewerLoggedIn,
  viewerFollows,
  activeTab: requestedTab,
  baseHref,
  defaultEmail,
  showPrivateTools = false,
}: ProfileExperienceProps) {
  const canSeeSaved = isOwner || profile.is_saves_public;
  const canSeeLiked = isOwner || profile.is_likes_public;
  const [carsResult, savedResult, likedResult, followingResult] = await Promise.all([
    qCarsByOwner(profile.id, isOwner),
    canSeeSaved ? qSavedCars(profile.id) : Promise.resolve({ data: [], error: null }),
    canSeeLiked ? qLikedCars(profile.id) : Promise.resolve({ data: [], error: null }),
    isOwner ? qFollowingProfiles(profile.id) : Promise.resolve({ data: [], error: null }),
  ]);
  const cars = carsResult.data ?? [];
  const savedCars = savedResult.data ?? [];
  const likedCars = likedResult.data ?? [];
  const followingProfiles = followingResult.data ?? [];
  const likesReceived = cars.reduce((sum, car) => sum + car.likes_count, 0);
  const coverImage = profile.cover_url || cars[0]?.main_photo_url || null;

  const tabs = [
    { key: "projetos" as const, label: "Projetos", icon: Wrench },
    ...(canSeeSaved ? [{ key: "salvos" as const, label: "Salvos", icon: Bookmark }] : []),
    ...(canSeeLiked ? [{ key: "curtidos" as const, label: "Curtidos", icon: Heart }] : []),
    ...(isOwner ? [{ key: "seguindo" as const, label: "Seguindo", icon: Users }] : []),
  ].map((tab) => ({ ...tab, href: tab.key === "projetos" ? baseHref : `${baseHref}?aba=${tab.key}` }));
  const activeTab = tabs.some((tab) => tab.key === requestedTab) ? requestedTab : "projetos";

  const content = activeTab === "salvos"
    ? { title: "Projetos salvos", cars: savedCars, emptyTitle: "Nenhum projeto salvo.", emptyDescription: isOwner ? "Explore projetos e salve suas referências favoritas." : "Este usuário não possui projetos salvos visíveis." }
    : activeTab === "curtidos"
      ? { title: "Projetos curtidos", cars: likedCars, emptyTitle: "Nenhum projeto curtido.", emptyDescription: isOwner ? "Os projetos que você curtir aparecerão aqui." : "Este usuário não possui projetos curtidos visíveis." }
      : { title: isOwner ? "Meus projetos" : "Projetos", cars, emptyTitle: isOwner ? "Você ainda não cadastrou nenhum projeto." : "Este usuário ainda não cadastrou projetos públicos.", emptyDescription: isOwner ? "Crie seu primeiro projeto para começar sua garagem." : "Volte em breve para conferir as novidades desta garagem." };

  let inspiration: React.ReactNode = null;
  if (showPrivateTools && isOwner && activeTab === "projetos") {
    const myCarSlugs = cars.map((car) => car.slug);
    const catalog = await getProjectCollection();
    const referenceSlugs = (savedCars.length
      ? savedCars.map((car) => car.slug)
      : catalog.allProjects.filter((project) => !myCarSlugs.includes(project.slug)).slice(0, 12).map((project) => project.slug)
    ).filter(Boolean);
    const [myProjects, referenceProjects] = await Promise.all([
      getProjectsBySlugs(myCarSlugs),
      getProjectsBySlugs(referenceSlugs),
    ]);
    inspiration = (
      <details className="mt-8 rounded-2xl border border-border/70 bg-background/25 p-4 open:bg-card/35 sm:p-5">
        <summary className="cursor-pointer list-none font-ui text-sm font-semibold text-foreground marker:hidden">
          Ferramenta privada: similaridade com inspiração
          <span className="ml-2 text-xs font-normal text-muted">Abrir planejador</span>
        </summary>
        <div className="mt-5">
          <InspirationPlanner mode="supabase" storageScope={profile.id} currentProjects={myProjects} inspirationProjects={referenceProjects} referenceSourceLabel={savedCars.length ? "Projetos salvos" : "Projetos em destaque"} />
        </div>
      </details>
    );
  }

  return (
    <>
      <ProfileSaveFeedback />
      <ProfileHeader profile={profile} isOwner={isOwner} viewerLoggedIn={viewerLoggedIn} viewerFollows={viewerFollows} coverImage={coverImage} projectsCount={cars.length} likesReceived={likesReceived} defaultEmail={defaultEmail} />
      <ProfileTabs tabs={tabs} activeTab={activeTab} />

      <section className="mt-5 sm:mt-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-title text-xl font-semibold tracking-tight sm:text-2xl">{activeTab === "seguindo" ? "Garagens que sigo" : content.title}</h2>
          {isOwner && activeTab === "projetos" ? (
            <Button asChild size="sm"><Link href="/criar-projeto"><Plus className="size-4" />Adicionar projeto</Link></Button>
          ) : null}
        </div>

        {activeTab === "seguindo" ? (
          <FollowingGrid profiles={followingProfiles} isOwner={isOwner} />
        ) : (
          <CarGrid
            cars={content.cars}
            variant="profile"
            emptyTitle={content.emptyTitle}
            emptyDescription={content.emptyDescription}
            emptyAction={isOwner && activeTab === "projetos" ? <Button asChild><Link href="/criar-projeto"><Plus className="size-4" />Adicionar meu primeiro projeto</Link></Button> : undefined}
          />
        )}
      </section>
      {inspiration}
    </>
  );
}
