import Link from "next/link";
import { notFound } from "next/navigation";

import { CarForm } from "@/components/garage/car-form";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { qCarBySlug } from "@/lib/supabase/queries";
import { getSupabaseServerUser } from "@/lib/supabase/auth-server";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata = {
  title: "Editar projeto",
};

export default async function EditProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await qCarBySlug(slug);
  if (!result.data) notFound();

  const user = await getSupabaseServerUser();

  const car = result.data;
  const canEdit = user?.id === car.owner_id;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mobile-page-shell mx-auto w-full max-w-5xl pb-12 md:pt-24">
          {!user ? (
            <Card className="p-6 md:p-8">
              <h1 className="font-title text-2xl tracking-tight">Entre para editar</h1>
              <p className="mt-2 text-sm text-muted">
                Apenas o dono do projeto pode editar esta ficha.
              </p>
              <Button asChild className="mt-6">
                <Link href={`/login?next=/projeto/${car.slug}/editar`}>Entrar</Link>
              </Button>
            </Card>
          ) : !canEdit ? (
            <Card className="p-6 md:p-8">
              <h1 className="font-title text-2xl tracking-tight">Acesso restrito</h1>
              <p className="mt-2 text-sm text-muted">
                Voce so pode editar projetos cadastrados no seu perfil.
              </p>
              <Button asChild className="mt-6" variant="outline">
                <Link href={`/projeto/${car.slug}`}>Voltar para o projeto</Link>
              </Button>
            </Card>
          ) : (
            <CarForm
              mode="edit"
              car={car}
              parts={car.parts}
              photos={car.photos}
              updates={car.updates}
              expenses={car.expenses}
            />
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
