import Link from "next/link";

import { ProjectForm } from "@/components/projects/project-form";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Criar projeto",
};

export default async function CreateProjectPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-5xl pt-20 md:pt-24 pb-12">
          {!supabase ? (
            <ProjectForm storageMode="local" />
          ) : !user ? (
            <Card className="p-6 md:p-8">
              <h1 className="font-title text-2xl tracking-tight">Entre para criar seu projeto</h1>
              <p className="mt-2 text-sm text-muted">
                Projetos publicos precisam estar ligados a um perfil de usuario.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button asChild>
                  <Link href="/login?next=/criar-projeto">Entrar</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/explorar">Explorar projetos</Link>
                </Button>
              </div>
            </Card>
          ) : (
            <ProjectForm storageMode="supabase" />
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
