import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Camera, Search, Share2, Wrench } from "lucide-react";

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
        <section className="relative min-h-[40rem] overflow-hidden border-b border-border/50 px-4 sm:px-6 md:min-h-[88svh]">
          <div className="absolute inset-0">
            <Image
              src="/ref/hero-car.jpg"
              alt=""
              fill
              priority
              loading="eager"
              className="object-cover object-[68%_center] opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/15" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/35" />
            <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:72px_72px]" />
          </div>

          <div className="relative mx-auto flex min-h-[40rem] w-full max-w-6xl flex-col justify-end pb-8 pt-28 md:min-h-[88svh] md:pb-12">
            <div className="max-w-[52rem]">
              <p className="pg-eyebrow">A cultura automotiva, projeto por projeto</p>
              <h1 className="mt-4 font-title text-[2.55rem] leading-[0.98] tracking-[-0.045em] sm:text-5xl md:text-[4.75rem] md:leading-[0.96]">
                Seu projeto merece mais do que um feed.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-foreground/70 md:text-lg">
                Documente peças, acertos, custos e evolução em uma ficha feita para carros.
                Descubra builds reais e acompanhe cada nova fase da comunidade.
              </p>
              <div className="mt-7 flex flex-col gap-2 sm:flex-row md:mt-9 md:gap-3">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/criar-projeto">
                    Criar minha garagem
                    <ArrowUpRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full border-foreground/15 bg-black/25 sm:w-auto">
                  <Link href="/explorar">Explorar projetos</Link>
                </Button>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-0 border-y border-white/10 py-4 md:mt-12 md:max-w-2xl md:py-5">
              {[
                ["Ficha completa", "Specs e peças"],
                ["Evolução real", "Timeline do build"],
                ["Comunidade", "Referências reais"],
              ].map(([title, text], index) => (
                <div key={title} className={index ? "border-l border-white/10 pl-3 md:pl-5" : "pr-3 md:pr-5"}>
                  <p className="font-ui text-[11px] font-semibold text-foreground md:text-sm">{title}</p>
                  <p className="mt-1 hidden text-xs text-muted sm:block">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6">
          <div className="mx-auto w-full max-w-6xl py-12 md:py-20">
            <div className="max-w-2xl">
              <p className="pg-eyebrow">Feito para o processo inteiro</p>
              <h2 className="mt-3 font-title text-3xl tracking-tight md:text-4xl">Da primeira peça ao acerto final.</h2>
            </div>
            <div className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2 md:mt-10 lg:grid-cols-4">
            {[
              { title: "Apresente o build", text: "Uma página pública com identidade, fotos e ficha técnica.", icon: Camera },
              { title: "Organize cada etapa", text: "Peças instaladas, planos e evolução no mesmo lugar.", icon: Wrench },
              { title: "Compartilhe com presença", text: "Um link direto para mostrar o projeto completo.", icon: Share2 },
              { title: "Encontre referências", text: "Busque por modelo, preparação, estilo e especificação.", icon: Search },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="pg-section-rule pt-5">
                  <Icon className="size-5 text-accent" />
                  <h3 className="mt-5 font-title text-lg tracking-tight">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{item.text}</p>
                </div>
              );
            })}
            </div>
          </div>
        </section>

        <section className="border-y border-border/45 bg-background-2/45 px-4 sm:px-6">
          <div className="mx-auto w-full max-w-6xl py-12 md:py-20">
            <div className="mb-6 flex items-end justify-between gap-3 md:mb-8">
              <div>
                <p className="pg-eyebrow">Seleção da comunidade</p>
                <h2 className="mt-3 font-title text-3xl leading-tight tracking-tight md:text-4xl">Garagens que merecem atenção</h2>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0 md:h-10 md:px-4">
                <Link href="/explorar">Ver catálogo</Link>
              </Button>
            </div>
            <ProjectGrid
              projects={projects}
              emptyTitle="Ainda não há projetos em destaque."
              emptyDescription="Seja o primeiro a publicar uma garagem completa para a comunidade."
            />
          </div>
        </section>

        <section className="px-4 sm:px-6">
          <div className="mx-auto w-full max-w-6xl py-12 md:py-20">
            <Card className="relative overflow-hidden border-accent/20 bg-gradient-to-br from-card to-accent/[0.07] p-6 md:p-10">
              <div className="absolute -right-16 -top-20 size-72 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
              <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="pg-eyebrow">Sua história começa na garagem</p>
                  <h2 className="mt-3 max-w-2xl font-title text-3xl leading-tight tracking-tight md:text-4xl">
                    Transforme evolução em legado.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted md:text-base">
                    Publique o projeto, registre as mudanças e deixe cada escolha falar por ele.
                  </p>
                </div>
                <Button asChild size="lg" className="min-h-11 md:min-h-12">
                  <Link href="/criar-projeto">Adicionar meu projeto</Link>
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
