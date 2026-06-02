import Link from "next/link";
import { notFound } from "next/navigation";

import { CarForm } from "@/components/garage/car-form";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { qCarBySlug } from "@/lib/supabase/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata = {
  title: "Editar carro",
};

export default async function EditCarPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await qCarBySlug(slug);
  if (!result.data) notFound();

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const car = result.data;
  const canEdit = user?.id === car.owner_id;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-5xl pt-20 md:pt-24 pb-12">
          {!user ? (
            <Card className="p-6 md:p-8">
              <h1 className="font-title text-2xl tracking-tight">Entre para editar</h1>
              <p className="mt-2 text-sm text-muted">
                Apenas o dono do carro pode editar esta ficha.
              </p>
              <Button asChild className="mt-6">
                <Link href={`/login?next=/carros/${car.slug}/editar`}>Entrar</Link>
              </Button>
            </Card>
          ) : !canEdit ? (
            <Card className="p-6 md:p-8">
              <h1 className="font-title text-2xl tracking-tight">Acesso restrito</h1>
              <p className="mt-2 text-sm text-muted">
                Voce so pode editar carros cadastrados no seu perfil.
              </p>
              <Button asChild className="mt-6" variant="outline">
                <Link href={`/carros/${car.slug}`}>Voltar para o carro</Link>
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
