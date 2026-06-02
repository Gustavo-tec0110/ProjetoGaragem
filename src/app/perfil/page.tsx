import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/garage/profile-form";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Card } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Perfil",
};

export default async function PerfilPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!supabase || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteNavbar />
        <main className="flex-1 px-4 sm:px-6">
          <div className="mx-auto w-full max-w-3xl pt-20 md:pt-24 pb-12">
            <Card className="p-6 md:p-8">
              <h1 className="font-title text-2xl tracking-tight">Perfil indisponivel</h1>
              <p className="mt-2 text-sm text-muted">
                Entre na sua conta para criar ou editar seu perfil.
              </p>
            </Card>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const current = await getCurrentProfile();
  if (current.profile) redirect(`/perfil/${current.profile.username}`);

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
