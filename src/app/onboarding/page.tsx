import { ProfileForm } from "@/components/garage/profile-form";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Card } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Onboarding",
};

export default async function OnboardingPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const current = user ? await getCurrentProfile() : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mobile-page-shell mx-auto w-full max-w-3xl pb-12 md:pt-24">
          {!user ? (
            <Card className="p-6 md:p-8">
              <h1 className="font-title text-2xl tracking-tight">Entre para criar seu perfil</h1>
              <p className="mt-2 text-sm text-muted">
                Depois disso voce cadastra o primeiro carro da sua garagem.
              </p>
            </Card>
          ) : (
            <ProfileForm profile={current?.profile ?? null} defaultEmail={user.email} />
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
