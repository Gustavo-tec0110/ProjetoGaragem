import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Camera, Share2, Trophy, Warehouse, Wrench } from "lucide-react";

import { ProjectGrid } from "@/components/projects/project-grid";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SkeletonProjectGrid } from "@/components/ui/page-skeletons";
import { getFeaturedProjects } from "@/lib/projects/server";
import { buildProjectHref } from "@/lib/projects/utils";

export const revalidate = 60;

async function FeaturedProjectNote() {
  const [project] = await getFeaturedProjects(1, "likes");

  if (!project) return null;

  const specs = [
    project.year ? String(project.year) : null,
    project.powerCv ? `${project.powerCv} cv` : null,
    project.ownerName || null,
  ].filter(Boolean);

  return (
    <Link
      href={buildProjectHref(project.slug)}
      className="group absolute right-4 top-24 z-20 hidden w-64 border-l border-white/20 pl-4 transition-colors hover:border-accent sm:block lg:right-8 lg:top-28"
      aria-label={`Ver projeto em destaque: ${project.title}`}
    >
      <p className="font-ui text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
        <span className="text-accent">01</span> / Projeto em destaque
      </p>
      <p className="mt-2 font-title text-sm font-bold uppercase tracking-[0.04em] text-white transition-colors group-hover:text-accent">
        {project.title}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-ui text-[10px] uppercase tracking-[0.1em] text-white/55">
        {specs.map((spec) => (
          <span key={spec}>{spec}</span>
        ))}
      </div>
    </Link>
  );
}

async function FeaturedProjectsSection() {
  const projects = await getFeaturedProjects(6, "likes");

  return (
    <ProjectGrid
      projects={projects}
      emptyTitle="Ainda não há projetos em destaque."
      emptyDescription="Seja o primeiro a publicar uma garagem completa para a comunidade."
    />
  );
}

function FeaturedProjectsFallback() {
  return <SkeletonProjectGrid count={3} />;
}

const features = [
  { title: "Sua garagem", text: "Organize seus projetos.", icon: Warehouse },
  { title: "Registre tudo", text: "Documente cada evolução.", icon: Wrench },
  { title: "Compartilhe", text: "Mostre sua build.", icon: Camera },
  { title: "Rankings", text: "Compare e participe.", icon: Trophy },
] as const;

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1">
        <section className="border-b border-white/10 bg-black">
          <div className="relative isolate h-[40rem] overflow-hidden md:h-[650px]">
            <div className="absolute inset-x-0 top-0 h-[23rem] md:inset-y-0 md:left-auto md:h-auto md:w-[min(100%,1672px)]">
              <Image
                src="/ref/hero-garage-v2.webp"
                alt="Carro esportivo preto preparado em uma garagem subterrânea"
                fill
                preload
                fetchPriority="high"
                quality={85}
                sizes="(min-width: 1672px) 1672px, 100vw"
                className="object-cover object-[58%_center] md:object-center"
              />
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,4,5,.08)_0%,rgba(3,4,5,.12)_32%,rgba(3,4,5,.94)_70%,#08090b_100%)] md:bg-[linear-gradient(90deg,#050607_0%,rgba(5,6,7,.94)_20%,rgba(5,6,7,.56)_42%,rgba(5,6,7,.08)_72%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.4)_0%,transparent_22%,transparent_68%,rgba(0,0,0,.7)_100%)]" />
            <div className="absolute inset-0 opacity-[0.1] [background-image:repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,.08)_4px)]" />

            <Suspense fallback={null}>
              <FeaturedProjectNote />
            </Suspense>

            <div className="relative mx-auto flex h-full w-full max-w-[90rem] items-end px-4 pb-7 pt-24 sm:px-6 md:items-start md:pb-6 md:pt-24 lg:px-12">
              <div className="w-full max-w-[34rem] motion-safe:animate-[pg-content-reveal_.7s_.15s_var(--pg-ease-out)_both]">
              <div className="flex items-center gap-3 font-ui text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
                <span className="h-4 w-px bg-accent" aria-hidden="true" />
                Bem-vindo ao Projeto Garagem
              </div>
              <h1 className="mt-5 max-w-[9ch] font-title text-[2.85rem] font-extrabold uppercase italic leading-[0.89] tracking-[-0.06em] text-white drop-shadow-2xl min-[390px]:text-[3.25rem] sm:text-6xl md:mt-7 md:text-[4.35rem] lg:text-[4.75rem]">
                Sua garagem. Seu projeto.
              </h1>
              <p className="mt-5 max-w-md text-sm leading-6 text-white/65 sm:text-base md:mt-7 md:text-lg md:leading-7">
                Monte, documente e compartilhe seu carro com quem vive a mesma paixão.
              </p>

              <div className="mt-6 flex max-w-md flex-col gap-2 sm:flex-row md:mt-8 md:gap-3">
                <Button asChild size="lg" className="h-12 w-full rounded-sm uppercase sm:w-auto md:h-13">
                  <Link href="/criar-projeto">
                    Criar projeto
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 w-full rounded-sm border-white/15 bg-black/25 uppercase backdrop-blur-sm sm:w-auto md:h-13"
                >
                  <Link href="/explorar">Explorar projetos</Link>
                </Button>
              </div>

              <div className="mt-6 flex items-center gap-3 font-ui text-[9px] font-semibold uppercase tracking-[0.13em] text-white/38 md:mt-8 md:text-[10px]">
                <span>Projetos</span>
                <span className="size-0.5 rounded-full bg-accent" />
                <span>Comunidade</span>
                <span className="size-0.5 rounded-full bg-accent" />
                <span>Builds reais</span>
              </div>
              </div>
            </div>
          </div>

          <div className="mx-auto grid w-full max-w-[86rem] grid-cols-2 border-x border-white/10 bg-[#0b0d0f]/95 shadow-2xl md:grid-cols-4 md:backdrop-blur-xl">
            {features.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className={`flex min-h-24 items-center gap-3 p-4 md:min-h-28 md:px-6 ${
                    index % 2 ? "border-l border-white/8" : ""
                  } ${index > 1 ? "border-t border-white/8 md:border-t-0" : ""} ${
                    index > 0 ? "md:border-l md:border-white/8" : ""
                  }`}
                >
                  <Icon className="size-6 shrink-0 stroke-[1.4] text-accent md:size-7" aria-hidden="true" />
                  <div className="min-w-0">
                    <h2 className="font-ui text-[10px] font-bold uppercase tracking-[0.04em] text-white md:text-xs">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-[10px] leading-4 text-white/42 md:text-xs">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="border-b border-border/45 bg-background-2/45 px-4 sm:px-6">
          <div className="mx-auto w-full max-w-6xl py-12 md:py-20">
            <div className="mb-6 flex items-end justify-between gap-3 md:mb-8">
              <div>
                <p className="pg-eyebrow">Seleção da comunidade</p>
                <h2 className="mt-3 font-title text-3xl leading-tight tracking-tight md:text-4xl">
                  Garagens que merecem atenção
                </h2>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0 md:h-10 md:px-4">
                <Link href="/explorar">Ver catálogo</Link>
              </Button>
            </div>
            <Suspense fallback={<FeaturedProjectsFallback />}>
              <FeaturedProjectsSection />
            </Suspense>
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
                  <Link href="/criar-projeto">
                    Adicionar meu projeto
                    <Share2 className="size-4" />
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
