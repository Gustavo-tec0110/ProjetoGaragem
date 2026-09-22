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
      className="group absolute right-4 top-24 z-20 hidden w-64 rounded-lg border border-white/10 bg-black/45 p-3.5 backdrop-blur-md transition-colors hover:border-accent/45 sm:block lg:right-8 lg:top-28 lg:w-72 lg:p-4"
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
  { title: "Crie sua garagem", text: "Seus carros em um só lugar.", icon: Warehouse },
  { title: "Documente o projeto", text: "Peças, fotos e evolução.", icon: Wrench },
  { title: "Mostre sua build", text: "Compartilhe com a comunidade.", icon: Camera },
  { title: "Entre no ranking", text: "Compare projetos da comunidade.", icon: Trophy },
] as const;

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1">
        <section className="border-b border-white/10 bg-black">
          <div className="relative isolate h-[40rem] overflow-hidden md:h-[430px]">
            <div className="absolute inset-x-0 top-0 h-[23rem] md:inset-y-0 md:left-auto md:h-auto md:w-[min(100%,1672px)]">
              <Image
                src="/ref/hero-garage-v2.webp"
                alt="Carro esportivo preto preparado em uma garagem subterrânea"
                fill
                preload
                fetchPriority="high"
                quality={85}
                sizes="(min-width: 1672px) 1672px, 100vw"
                className="object-cover object-[58%_center] md:object-[center_53%]"
              />
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,4,5,.08)_0%,rgba(3,4,5,.12)_32%,rgba(3,4,5,.94)_70%,#08090b_100%)] md:bg-[linear-gradient(90deg,#050607_0%,rgba(5,6,7,.96)_24%,rgba(5,6,7,.52)_47%,rgba(5,6,7,.08)_76%,rgba(5,6,7,.24)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.32)_0%,transparent_22%,transparent_68%,rgba(0,0,0,.58)_100%)]" />
            <div className="absolute inset-0 opacity-[0.1] [background-image:repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,.08)_4px)]" />

            <Suspense fallback={null}>
              <FeaturedProjectNote />
            </Suspense>

            <div className="relative mx-auto flex h-full w-full max-w-[90rem] items-end px-4 pb-7 pt-24 sm:px-6 md:items-start md:pb-3 md:pt-32 lg:px-16 xl:px-20">
              <div className="w-full max-w-[34rem] motion-safe:animate-[pg-content-reveal_.7s_.15s_var(--pg-ease-out)_both]">
                <div className="flex items-center gap-3 font-ui text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
                  <span className="h-4 w-px bg-accent" aria-hidden="true" />
                  Bem-vindo ao Projeto Garagem
                </div>
                <h1 className="mt-4 font-title text-[2.85rem] font-extrabold uppercase italic leading-[0.9] tracking-[-0.06em] text-white drop-shadow-2xl min-[390px]:text-[3.25rem] md:text-[3.35rem] lg:text-[3.65rem]">
                  <span className="block md:whitespace-nowrap">Sua garagem.</span>
                  <span className="block md:whitespace-nowrap">
                    Seu <span className="text-accent">projeto.</span>
                  </span>
                </h1>
                <p className="mt-4 max-w-[31rem] text-sm leading-6 text-white/68 sm:text-base md:text-base md:leading-6">
                  Monte, documente e compartilhe seu carro com quem vive a mesma paixão.
                </p>

                <div className="mt-5 flex max-w-md flex-col gap-2 sm:flex-row md:gap-3">
                  <Button asChild size="lg" className="h-12 w-full rounded-sm uppercase sm:w-auto md:h-11">
                    <Link href="/criar-projeto">
                      Criar projeto
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-12 w-full rounded-sm border-white/15 bg-black/25 uppercase backdrop-blur-sm sm:w-auto md:h-11"
                  >
                    <Link href="/explorar">Explorar projetos</Link>
                  </Button>
                </div>

                <div className="mt-5 flex items-center gap-3 font-ui text-[9px] font-semibold uppercase tracking-[0.13em] text-white/38 md:text-[10px]">
                  <span>Projetos</span>
                  <span className="size-0.5 rounded-full bg-accent" />
                  <span>Comunidade</span>
                  <span className="size-0.5 rounded-full bg-accent" />
                  <span>Builds reais</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto grid w-full max-w-[86rem] grid-cols-1 border-x border-white/10 bg-[#0b0d0f]/95 shadow-2xl sm:grid-cols-2 md:grid-cols-4 md:backdrop-blur-xl xl:mx-5 xl:w-[calc(100%_-_2.5rem)] xl:max-w-none">
            {features.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className={`relative flex min-h-[72px] items-center gap-3 px-4 py-3 md:min-h-[70px] md:gap-3 md:px-5 ${
                    index > 0 ? "border-t border-white/8" : ""
                  } ${index % 2 ? "sm:border-l sm:border-white/8" : ""} ${
                    index > 1 ? "sm:border-t sm:border-white/8" : "sm:border-t-0"
                  } ${
                    index > 0
                      ? "md:border-l-0 md:before:pointer-events-none md:before:absolute md:before:left-0 md:before:top-1/2 md:before:h-9 md:before:w-px md:before:-translate-y-1/2 md:before:bg-white/[0.07]"
                      : ""
                  } md:border-t-0`}
                >
                  <span className="relative isolate inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent/40 bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.13),transparent_34%),linear-gradient(145deg,rgba(255,53,47,0.06),rgba(20,23,28,0.68)_44%,rgba(4,5,7,0.86))] text-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_3px_7px_rgba(255,53,47,0.1),inset_0_-10px_13px_rgba(0,0,0,0.62),0_0_12px_rgba(255,53,47,0.14)] backdrop-blur-md before:pointer-events-none before:absolute before:-left-[22%] before:-top-[30%] before:size-[90%] before:rounded-full before:bg-[radial-gradient(circle,rgba(255,255,255,0.24)_0%,rgba(255,255,255,0.07)_34%,transparent_70%)] before:content-[''] after:pointer-events-none after:absolute after:inset-[2px] after:rounded-full after:bg-[linear-gradient(135deg,rgba(255,255,255,0.1),transparent_30%,transparent_68%,rgba(255,53,47,0.08))] after:content-[''] md:size-[44px]">
                    <Icon className="relative z-10 size-[18px] stroke-[1.5] md:size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate font-ui text-[12px] font-bold uppercase leading-[1.15] tracking-[0.04em] text-white md:text-[13px]">
                      {item.title}
                    </h2>
                    <p className="mt-px truncate text-[11px] leading-[1.3] text-white/54 md:text-[11px]">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="border-b border-border/45 bg-background-2/45 px-4 sm:px-6">
          <div className="mx-auto w-full max-w-6xl py-10 md:pb-16 md:pt-8">
            <div className="mb-5 flex items-end justify-between gap-3 md:mb-6">
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
