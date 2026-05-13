import Link from "next/link";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Projetos",
};

export default function ProjetosPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl pt-24 pb-12">
          <h1 className="font-title text-3xl md:text-4xl tracking-tight">
            Projetos
          </h1>
          <p className="mt-2 text-muted max-w-2xl">
            Aqui ficarão seus projetos salvos, builds compartilhadas e históricos
            de compatibilidade.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <h2 className="font-title text-lg tracking-tight">
                Comece por uma build pronta
              </h2>
              <p className="mt-2 text-muted text-sm">
                Escolha estilo, carro e orçamento — e ajuste as peças com alertas
                de compatibilidade.
              </p>
              <div className="mt-4">
                <Button asChild>
                  <Link href="/montar">Montar Projeto</Link>
                </Button>
              </div>
            </Card>
            <Card className="p-6">
              <h2 className="font-title text-lg tracking-tight">
                Explore o ranking da comunidade
              </h2>
              <p className="mt-2 text-muted text-sm">
                Builds mais curtidas da semana por categoria (JDM, Som, Sleeper,
                Drift).
              </p>
              <div className="mt-4">
                <Button asChild variant="outline">
                  <Link href="/comunidade">Ver Comunidade</Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

