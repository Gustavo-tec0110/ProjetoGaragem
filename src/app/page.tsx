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
      className="group absolute bottom-7 right-[clamp(1.5rem,6vw,7rem)] z-20 hidden w-[min(18rem,28vw)] border-l-2 border-accent pl-4 transition-colors sm:block"
      aria-label={`Ver projeto em destaque: ${project.title}`}
    >
      <p className="font-ui text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
        Projeto em destaque
      </p>
      <p className="mt-1.5 truncate font-title text-sm font-bold tracking-[0.01em] text-white transition-colors group-hover:text-accent lg:text-base">
        {project.title}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-ui text-[10px] tracking-[0.06em] text-white/55">
        {specs.map((spec) => (
          <span key={spec} className="after:ml-2 after:text-white/20 after:content-['|'] last:after:hidden">
            {spec}
          </span>
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
          <div className="relative isolate h-[38rem] overflow-hidden md:h-[clamp(25.5rem,29vw,28.5rem)]">
            <div className="absolute inset-x-0 top-0 h-[23rem] bg-black md:inset-y-0 md:left-auto md:h-auto md:w-[min(100%,1280px)]">
              <Image
                src="/ref/hero-opala-ss.webp"
                alt="Chevrolet Opala SS preto preparado em uma oficina"
                fill
                preload
                fetchPriority="high"
                quality={88}
                sizes="(min-width: 1280px) 1280px, 100vw"
                className="object-cover object-[38%_center] sm:object-[68%_center] md:object-[68%_35%]"
              />
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,4,5,.06)_0%,rgba(3,4,5,.14)_30%,rgba(3,4,5,.94)_68%,#08090b_100%)] md:bg-[linear-gradient(90deg,#050607_0%,rgba(5,6,7,.97)_23%,rgba(5,6,7,.68)_39%,rgba(5,6,7,.14)_65%,rgba(5,6,7,.18)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.3)_0%,transparent_25%,transparent_67%,rgba(0,0,0,.72)_100%)]" />
            <div className="absolute inset-0 opacity-[0.055] [background-image:repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,.08)_4px)]" />

            <Suspense fallback={null}>
              <FeaturedProjectNote />
            </Suspense>

            <div className="relative mx-auto flex h-full w-full max-w-[100rem] items-end px-4 pb-7 pt-24 sm:px-6 md:items-start md:pb-3 md:pt-[clamp(7.5rem,8vw,8.75rem)] lg:px-16 xl:px-20">
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

              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.07] bg-[#090b0d]">
            <div className="mx-auto grid w-full max-w-[100rem] grid-cols-2 px-4 sm:px-6 lg:grid-cols-4 xl:px-10">
              {features.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className={`relative flex min-h-[72px] items-center gap-2 px-1 py-3 sm:gap-3 sm:px-4 lg:px-3 xl:px-6 ${
                      index > 1 ? "border-t border-white/[0.06]" : ""
                    } ${index % 2 ? "border-l border-white/[0.06]" : ""} ${
                      index > 0
                        ? "lg:border-l-0 lg:before:pointer-events-none lg:before:absolute lg:before:left-0 lg:before:top-1/2 lg:before:h-9 lg:before:w-px lg:before:-translate-y-1/2 lg:before:bg-white/[0.07]"
                        : ""
                    } lg:border-t-0`}
                  >
                    <span className="relative isolate inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent/45 bg-black/45 text-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] sm:size-10 md:size-11">
                      <Icon className="relative z-10 size-[18px] stroke-[1.6] md:size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-ui text-[11px] font-bold leading-[1.15] tracking-[0.01em] text-white sm:truncate sm:text-[12px] md:text-[13px]">
                        {item.title}
                      </h2>
                      <p className="mt-1 truncate text-[11px] leading-[1.3] text-white/48 md:text-[11px]">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b border-border/45 bg-background-2/45 px-4 sm:px-6">
          <div className="mx-auto w-full max-w-[100rem] py-8 md:pb-14 md:pt-7">
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
