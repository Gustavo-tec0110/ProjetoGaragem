import Link from "next/link";

import { ProjectForm } from "@/components/projects/project-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { qCarCatalogVersions } from "@/lib/supabase/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServerUser } from "@/lib/supabase/auth-server";

export const metadata = {
  title: "Criar projeto",
};

export default async function CreateProjectPage() {
  const [supabase, catalog, user] = await Promise.all([
    getSupabaseServerClient(),
    qCarCatalogVersions(),
    getSupabaseServerUser(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 px-4 sm:px-6">
        <div className="mobile-page-shell mx-auto w-full max-w-5xl pb-12 md:pt-24">
          {!supabase ? (
            <ProjectForm storageMode="local" catalogVersions={catalog.data ?? []} />
          ) : !user ? (
            <Card className="p-4 md:p-8">
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
            <ProjectForm storageMode="supabase" catalogVersions={catalog.data ?? []} />
          )}
        </div>
      </main>
    </div>
  );
}
