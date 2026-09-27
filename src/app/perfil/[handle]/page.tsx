import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProfileExperience, type ProfileTabKey } from "@/components/garage/profile-experience";
import { ProfileContentSkeleton } from "@/components/ui/page-skeletons";
import { createSeoMetadata } from "@/lib/seo";
import {
  qProfileById,
  qPublicProfileByUsername,
  qViewerFollowsProfile,
} from "@/lib/supabase/queries";
import { getSupabaseServerUser } from "@/lib/supabase/auth-server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function profileTab(value: string | undefined): ProfileTabKey {
  return value === "salvos" || value === "curtidos" || value === "seguindo" ? value : "projetos";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const result = await qPublicProfileByUsername(handle);
  if (!result.data) {
    return createSeoMetadata({
      title: "Perfil não encontrado",
      description: "O perfil público solicitado não foi encontrado.",
      path: `/perfil/${handle}`,
    });
  }
  return createSeoMetadata({
    title: result.data.display_name,
    description: result.data.bio ?? `Garagem pública de @${result.data.username}.`,
    path: `/perfil/${handle}`,
    canonicalPath: `/perfil/${handle}`,
    image: result.data.avatar_url,
    type: "profile",
  });
}

async function PublicProfileContent({
  handle,
  activeTab,
}: {
  handle: string;
  activeTab: ProfileTabKey;
}) {
  const [profileResult, supabase, user] = await Promise.all([
    qPublicProfileByUsername(handle),
    getSupabaseServerClient(),
    getSupabaseServerUser(),
  ]);
  if (!profileResult.data || !supabase) notFound();

  const isOwner = user?.id === profileResult.data.id;
  const [ownProfileResult, followingResult] = await Promise.all([
    isOwner ? qProfileById(supabase, profileResult.data.id) : Promise.resolve(null),
    user?.id && !isOwner ? qViewerFollowsProfile(profileResult.data.id) : Promise.resolve({ data: false, error: null }),
  ]);
  const profile = ownProfileResult?.data ?? profileResult.data;

  return (
    <ProfileExperience
      profile={profile}
      isOwner={isOwner}
      viewerLoggedIn={Boolean(user)}
      viewerFollows={followingResult.data ?? false}
      activeTab={activeTab}
      baseHref={`/perfil/${profile.username}`}
      defaultEmail={user?.email}
      showPrivateTools={isOwner}
    />
  );
}

export default async function PublicProfilePage({ params, searchParams }: PageProps) {
  const [{ handle }, query] = await Promise.all([params, searchParams]);
  const activeTab = profileTab(firstParam(query.aba));

  return (
    <div className="min-h-screen bg-background">
      <main className="px-4 sm:px-6">
        <div className="mobile-page-shell mx-auto w-full max-w-6xl pb-12 md:pt-24">
          <Suspense fallback={<ProfileContentSkeleton />}>
            <PublicProfileContent handle={handle} activeTab={activeTab} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
