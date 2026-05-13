"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Heart,
  PackageOpen,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const styles = [
  { id: "jdm", label: "JDM", kits: 128 },
  { id: "corrida", label: "Corrida", kits: 96 },
  { id: "sleeper", label: "Sleeper", kits: 64 },
  { id: "som", label: "Som", kits: 72 },
  { id: "baixo", label: "Baixo", kits: 88 },
] as const;

const kits = [
  {
    id: "k1",
    badge: "JDM",
    title: "Civic G8 JDM Project",
    desc: "Completo para estética e performance.",
    price: "R$ 12.890,00",
  },
  {
    id: "k2",
    badge: "SLEEPER",
    title: "Golf MK4 Sleeper",
    desc: "Performance discreta e eficiente.",
    price: "R$ 18.450,00",
  },
  {
    id: "k3",
    badge: "CORRIDA",
    title: "Celta Track Day",
    desc: "Preparado para track day.",
    price: "R$ 22.300,00",
  },
  {
    id: "k4",
    badge: "SOM",
    title: "Paredão Expert",
    desc: "Som automotivo de alta qualidade.",
    price: "R$ 6.750,00",
  },
  {
    id: "k5",
    badge: "BAIXO",
    title: "Saveiro Surf Rebaixada",
    desc: "Estilo e atitude nas alturas.",
    price: "R$ 9.890,00",
  },
] as const;

export function RefHomeLeft() {
  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative overflow-hidden rounded-4xl border border-border/70 bg-background/20"
      >
        <div className="absolute inset-0">
          <Image
            src="/ref/hero-car.jpg"
            alt=""
            fill
            className="object-cover object-right"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/30" />
        </div>

        <div className="relative p-6 md:p-10">
          <h1 className="font-title text-4xl md:text-5xl leading-[1.05] tracking-tight">
            Monte o projeto
            <br />
            dos seus <span className="text-accent">sonhos</span>.
          </h1>
          <p className="mt-4 max-w-md text-muted">
            Kits prontos, peças compatíveis e as melhores ofertas em um só lugar.
          </p>

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Button asChild className="sm:w-auto">
              <Link href="/kits">Ver kits prontos</Link>
            </Button>
            <Button asChild variant="outline" className="sm:w-auto">
              <Link href="/montar">Monte o seu</Link>
            </Button>
          </div>

          <div className="mt-10 flex items-center gap-2">
            <span className="size-2 rounded-full bg-accent" />
            <span className="size-2 rounded-full bg-border/80" />
            <span className="size-2 rounded-full bg-border/80" />
            <span className="size-2 rounded-full bg-border/80" />
          </div>
        </div>
      </motion.section>

      <section className="rounded-4xl border border-border/70 bg-background/20 p-5 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-title text-xl tracking-tight">Escolha um estilo</h2>
          <Link
            href="/explorar"
            className="text-sm font-ui font-semibold text-accent hover:brightness-110 transition"
          >
            Ver todos
          </Link>
        </div>

        <div className="mt-4 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {styles.map((style) => (
            <Link
              key={style.id}
              href="/montar"
              className="min-w-[190px] sm:min-w-[220px] group relative overflow-hidden rounded-4xl border border-border/70 bg-background/35"
            >
              <div className="absolute inset-0">
                <Image
                  src="/ref/hero-car.jpg"
                  alt=""
                  fill
                  className="object-cover object-center opacity-45 group-hover:opacity-60 transition"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
              </div>
              <div className="relative p-4">
                <p className="font-title tracking-tight">{style.label}</p>
                <p className="mt-1 text-xs text-muted">{style.kits} kits</p>
                <div className="mt-8 flex items-center justify-between">
                  <span className="text-xs text-muted">Explorar</span>
                  <span className="inline-flex size-10 items-center justify-center rounded-3xl border border-border/70 bg-background/40 group-hover:border-accent/35 transition">
                    <ArrowRight className="size-4 text-foreground" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-4xl border border-border/70 bg-background/20 p-5 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-title text-xl tracking-tight">Kits em destaque</h2>
          <Link
            href="/kits"
            className="text-sm font-ui font-semibold text-accent hover:brightness-110 transition"
          >
            Ver todos
          </Link>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {kits.map((kit) => (
            <div
              key={kit.id}
              className="group relative overflow-hidden rounded-4xl border border-border/70 bg-background/35"
            >
              <div className="absolute inset-0">
                <Image
                  src="/ref/hero-car.jpg"
                  alt=""
                  fill
                  className="object-cover object-center opacity-40 group-hover:opacity-55 transition"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/15" />
              </div>

              <div className="relative p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex items-center rounded-full border border-border/70 bg-black/35 px-3 py-1 text-xs font-ui font-semibold text-foreground">
                    {kit.badge}
                  </span>
                  <button
                    type="button"
                    className="inline-flex size-10 items-center justify-center rounded-3xl border border-border/70 bg-black/35 text-foreground hover:bg-black/55 transition"
                    aria-label="Favoritar"
                  >
                    <Heart className="size-4" />
                  </button>
                </div>

                <h3 className="mt-4 font-title tracking-tight">{kit.title}</h3>
                <p className="mt-2 text-sm text-muted">{kit.desc}</p>

                <p className="mt-4 text-sm font-ui font-semibold text-foreground">
                  {kit.price}
                </p>

                <div className="mt-4">
                  <Button className="w-full">Ver kit</Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              icon: <ShieldCheck className="size-5 text-accent" />,
              title: "Peças 100% compatíveis",
              desc: "Só vendemos kits com peças que funcionam juntas.",
            },
            {
              icon: <PackageOpen className="size-5 text-accent" />,
              title: "Melhores preços e ofertas",
              desc: "Parcerias com as melhores lojas do Brasil.",
            },
            {
              icon: <BadgeCheck className="size-5 text-accent" />,
              title: "Projetos testados e aprovados",
              desc: "Kits montados por especialistas e apaixonados por carros.",
            },
            {
              icon: <Wrench className="size-5 text-accent" />,
              title: "Suporte especializado",
              desc: "Tire dúvidas com nossa equipe e comunidade.",
            },
          ].map((info) => (
            <div
              key={info.title}
              className={cn(
                "rounded-4xl border border-border/70 bg-background/35 p-5",
                "hover:border-accent/25 transition-colors"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex size-11 items-center justify-center rounded-3xl border border-border/70 bg-background/40 shadow-glow">
                  {info.icon}
                </span>
                <p className="font-ui font-semibold tracking-tight">{info.title}</p>
              </div>
              <p className="mt-3 text-sm text-muted">{info.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
