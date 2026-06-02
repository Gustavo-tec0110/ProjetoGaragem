import Image from "next/image";
import Link from "next/link";
import { Camera, Search, Share2, Wrench } from "lucide-react";

import { CarGrid } from "@/components/garage/car-card";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { qExploreCars } from "@/lib/supabase/queries";

export default async function Home() {
  const featured = await qExploreCars({ sort: "likes", limit: 6 });
  const cars = featured.data ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1">
        <section className="relative min-h-[92vh] px-4 sm:px-6">
          <div className="absolute inset-0">
            <Image src="/ref/hero-car.jpg" alt="" fill priority className="object-cover object-right opacity-65" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/78 to-background/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />
          </div>

          <div className="relative mx-auto flex min-h-[92vh] w-full max-w-6xl flex-col justify-end pb-16 pt-28">
            <div className="max-w-3xl">
              <p className="text-xs text-muted">Projeto Garagem</p>
              <h1 className="mt-3 font-title text-4xl tracking-tight md:text-6xl">
                Crie a ficha completa do seu carro e descubra projetos reais da comunidade.
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-muted">
                Mostre suas pecas, especificacoes, fotos e planos futuros. Curta,
                salve e compare projetos automotivos do Brasil inteiro.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/carros/novo">Adicionar meu carro</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/explorar">Explorar projetos</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6">
          <div className="mx-auto grid w-full max-w-6xl gap-4 py-12 md:grid-cols-4">
            {[
              { title: "Cadastre seu carro", text: "Crie a pagina publica do projeto.", icon: Camera },
              { title: "Adicione pecas", text: "Separe instaladas e planejadas.", icon: Wrench },
              { title: "Compartilhe", text: "Use um link bonito da sua garagem.", icon: Share2 },
              { title: "Descubra", text: "Compare projetos por categoria.", icon: Search },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="p-5">
                  <Icon className="size-5 text-accent" />
                  <h2 className="mt-4 font-title text-lg tracking-tight">{item.title}</h2>
                  <p className="mt-2 text-sm text-muted">{item.text}</p>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="px-4 sm:px-6">
          <div className="mx-auto w-full max-w-6xl py-12">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs text-muted">Projetos em destaque</p>
                <h2 className="mt-2 font-title text-3xl tracking-tight">Garagens da comunidade</h2>
              </div>
              <Button asChild variant="outline">
                <Link href="/explorar">Ver todos</Link>
              </Button>
            </div>
            <CarGrid cars={cars} emptyTitle="Ainda nao ha projetos publicados." />
          </div>
        </section>

        <section className="px-4 sm:px-6">
          <div className="mx-auto w-full max-w-6xl pb-16">
            <Card className="p-6 md:p-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs text-muted">MVP focado</p>
                  <h2 className="mt-2 font-title text-3xl tracking-tight">
                    Uma pagina bonita para cada carro.
                  </h2>
                  <p className="mt-2 max-w-2xl text-muted">
                    Marketplace, afiliados avancados e chat ficam para depois. Agora o foco e
                    ficha publica, descoberta e interacao social simples.
                  </p>
                </div>
                <Button asChild size="lg">
                  <Link href="/carros/novo">Comecar agora</Link>
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
