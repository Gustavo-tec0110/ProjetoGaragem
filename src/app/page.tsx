import Image from "next/image";
import Link from "next/link";
import { Camera, Search, Share2, Wrench } from "lucide-react";

import { ProjectGrid } from "@/components/projects/project-grid";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getFeaturedProjects } from "@/lib/projects/server";

export default async function Home() {
  const projects = await getFeaturedProjects(6, "likes");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1">
        <section className="relative min-h-[440px] px-4 sm:min-h-[480px] sm:px-6 md:min-h-[92vh]">
          <div className="absolute inset-0">
            <Image
              src="/ref/hero-car.jpg"
              alt=""
              fill
              priority
              loading="eager"
              className="object-cover object-right opacity-65"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/78 to-background/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />
          </div>

          <div className="relative mx-auto flex min-h-[440px] w-full max-w-6xl flex-col justify-end pb-7 pt-24 sm:min-h-[480px] sm:pb-10 md:min-h-[92vh] md:pb-16 md:pt-28">
            <div className="max-w-3xl">
              <p className="text-xs text-muted">Projeto Garagem</p>
              <h1 className="mt-2 font-title text-[2rem] leading-[1.08] tracking-tight sm:text-4xl md:mt-3 md:text-6xl md:leading-[1.1]">
                <span className="md:hidden">Sua garagem online.</span>
                <span className="hidden md:inline">
                  Crie a ficha completa do seu projeto e descubra garagens reais da comunidade.
                </span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-5 text-muted sm:text-base md:mt-5 md:text-lg">
                <span className="md:hidden">Crie, organize e compartilhe seu projeto automotivo.</span>
                <span className="hidden md:inline">
                Mostre suas peças, especificações, fotos e planos futuros. Curta,
                salve e compare projetos automotivos do Brasil inteiro.
                </span>
              </p>
              <div className="mt-5 flex flex-row gap-2 sm:mt-6 sm:gap-3 md:mt-8">
                <Button asChild size="lg" className="min-h-11 flex-1 px-4 sm:flex-none">
                  <Link href="/criar-projeto">Adicionar meu projeto</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="min-h-11 px-4 max-[399px]:hidden">
                  <Link href="/explorar">Explorar projetos</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col">
        <section className="order-2 px-4 sm:px-6 md:order-1">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-2 py-8 sm:gap-3 md:grid-cols-4 md:gap-4 md:py-12">
            {[
              { title: "Cadastre seu projeto", text: "Crie a página pública da garagem.", icon: Camera },
              { title: "Adicione peças", text: "Separe instaladas e planejadas.", icon: Wrench },
              { title: "Compartilhe", text: "Use um link bonito da sua garagem.", icon: Share2 },
              { title: "Descubra", text: "Compare projetos por categoria.", icon: Search },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="p-3 sm:p-4 md:p-5">
                  <Icon className="size-4 text-accent md:size-5" />
                  <h2 className="mt-2 font-title text-sm leading-4 tracking-tight sm:text-base md:mt-4 md:text-lg">{item.title}</h2>
                  <p className="mt-1 line-clamp-1 text-[11px] leading-4 text-muted sm:text-xs md:mt-2 md:line-clamp-none md:text-sm">{item.text}</p>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="order-1 px-4 sm:px-6 md:order-2">
          <div className="mx-auto w-full max-w-6xl py-7 sm:py-9 md:py-12">
            <div className="mb-4 flex items-end justify-between gap-3 md:mb-5">
              <div>
                <p className="text-xs text-muted">Projetos em destaque</p>
                <h2 className="mt-1 font-title text-2xl leading-tight tracking-tight sm:text-3xl md:mt-2">Garagens da comunidade</h2>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0 md:h-10 md:px-4">
                <Link href="/explorar">Ver todos</Link>
              </Button>
            </div>
            <ProjectGrid
              projects={projects}
              emptyTitle="Ainda não há projetos para destacar."
              emptyDescription="Enquanto isso, o MVP pode usar os projetos demo e o cadastro local para não ficar vazio."
            />
          </div>
        </section>

        <section className="order-3 px-4 sm:px-6">
          <div className="mx-auto w-full max-w-6xl pb-8 md:pb-16">
            <Card className="p-4 sm:p-5 md:p-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs text-muted">MVP focado</p>
                  <h2 className="mt-1 font-title text-2xl leading-tight tracking-tight md:mt-2 md:text-3xl">
                    Uma página bonita para cada projeto.
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-5 text-muted md:text-base">
                    Marketplace, afiliados avancados e chat ficam para depois. Agora o foco e
                    ficha publica, descoberta e interacao social simples.
                  </p>
                </div>
                <Button asChild size="lg" className="min-h-11 md:min-h-12">
                  <Link href="/criar-projeto">Comecar agora</Link>
                </Button>
              </div>
            </Card>
          </div>
        </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
