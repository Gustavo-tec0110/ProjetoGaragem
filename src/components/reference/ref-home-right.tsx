"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CarFront,
  Cog,
  DollarSign,
  Package,
  Share2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const parts = [
  {
    id: "p2",
    title: "Suspensão\nRacing Coilovers",
    price: "R$ 2.850,00",
    seller: "Shopee",
    img: "/ref/part-coilovers.jpg",
  },
  {
    id: "p3",
    title: "Escape Esportivo\nInox 3”",
    price: "R$ 1.250,00",
    seller: "Mercado Livre",
    img: "/ref/part-exhaust.jpg",
  },
  {
    id: "p4",
    title: "Ponteira\nBurned Tip",
    price: "R$ 180,90",
    seller: "Shopee",
    img: "/ref/part-tip.jpg",
  },
  {
    id: "p5",
    title: "Subwoofer\nPioneer 12”",
    price: "R$ 699,00",
    seller: "Amazon",
    img: "/ref/part-sub.jpg",
  },
] as const;

const community = [
  { id: "c1", title: "Corolla XRS\nJDM Style", likes: "2.1k" },
  { id: "c2", title: "BMW 320i\nSleeper", likes: "1.7k" },
  { id: "c3", title: "Celta\nTrack Day", likes: "2.5k" },
  { id: "c4", title: "Saveiro G4\nRebaixada", likes: "1.9k" },
] as const;

export function RefHomeRight() {
  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative overflow-hidden rounded-4xl border border-border/70 bg-background/20"
      >
        <div className="absolute inset-0">
          <Image
            src="/ref/car-white.jpg"
            alt=""
            fill
            className="object-cover object-right opacity-90"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/25" />
        </div>

        <div className="relative p-5 md:p-6">
          <h2 className="font-title text-xl tracking-tight">Monte o seu projeto</h2>
          <p className="mt-2 text-sm text-muted max-w-sm">
            Escolha seu carro, estilo e orçamento — nós sugerimos as melhores combinações
            para você.
          </p>

          <div className="mt-4 grid gap-3">
            <div className="grid grid-cols-3 gap-2">
              <select className="h-11 rounded-3xl border border-border/70 bg-black/35 px-3 text-sm text-foreground">
                <option>Honda Civic G8</option>
                <option>VW Gol G5</option>
                <option>VW Golf MK7</option>
              </select>
              <select className="h-11 rounded-3xl border border-border/70 bg-black/35 px-3 text-sm text-foreground">
                <option>JDM</option>
                <option>Sleeper</option>
                <option>Corrida</option>
              </select>
              <select className="h-11 rounded-3xl border border-border/70 bg-black/35 px-3 text-sm text-foreground">
                <option>Até R$ 15.000</option>
                <option>Até R$ 30.000</option>
                <option>Até R$ 50.000</option>
              </select>
            </div>
            <Button asChild className="w-full">
              <Link href="/montar">Gerar projeto</Link>
            </Button>
          </div>
        </div>
      </motion.section>

      <section className="rounded-4xl border border-border/70 bg-background/20 p-5 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-title text-lg tracking-tight">Como funciona?</h3>
          <span className="text-xs text-muted font-ui font-semibold">Rápido e visual</span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          {[
            {
              icon: <CarFront className="size-5 text-accent" />,
              title: "1. Escolha seu carro",
              desc: "Selecione marca e modelo do seu carro.",
            },
            {
              icon: <Cog className="size-5 text-accent" />,
              title: "2. Defina o estilo",
              desc: "Escolha o estilo que mais combina com você.",
            },
            {
              icon: <DollarSign className="size-5 text-accent" />,
              title: "3. Ajuste o orçamento",
              desc: "Diga quanto quer investir no projeto.",
            },
            {
              icon: <Package className="size-5 text-accent" />,
              title: "4. Receba seu kit",
              desc: "Sugestões com peças compatíveis e compra rápida.",
            },
          ].map((step) => (
            <div
              key={step.title}
              className="rounded-4xl border border-border/70 bg-background/35 p-4"
            >
              <span className="inline-flex size-11 items-center justify-center rounded-3xl border border-border/70 bg-background/40 shadow-glow">
                {step.icon}
              </span>
              <p className="mt-3 text-sm font-ui font-semibold">{step.title}</p>
              <p className="mt-2 text-xs text-muted">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-4xl border border-border/70 bg-background/20 p-5 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-title text-lg tracking-tight">Peças em destaque</h3>
          <Link
            href="/explorar"
            className="text-sm font-ui font-semibold text-accent hover:brightness-110 transition"
          >
            Ver todos
          </Link>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {parts.map((part) => (
            <div
              key={part.id}
              className={cn(
                "rounded-4xl border border-border/70 bg-background/35 p-4",
                "hover:border-accent/25 transition-colors"
              )}
            >
              <div className="relative h-28 overflow-hidden rounded-3xl border border-border/70 bg-black/40">
                <Image
                  src={part.img}
                  alt=""
                  fill
                  className="object-contain p-2 opacity-90"
                />
              </div>
              <p className="mt-3 whitespace-pre-line text-sm font-ui font-semibold">
                {part.title}
              </p>
              <p className="mt-2 text-sm font-ui font-semibold text-accent">
                {part.price}
              </p>
              <p className="mt-1 text-xs text-muted">{part.seller}</p>
              <div className="mt-3">
                <Button size="sm" variant="outline" className="w-full">
                  Ver oferta
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-4xl border border-border/70 bg-background/20 p-5 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-title text-lg tracking-tight">Projetos da comunidade</h3>
          <Link
            href="/comunidade"
            className="text-sm font-ui font-semibold text-accent hover:brightness-110 transition"
          >
            Ver todos
          </Link>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {community.map((item) => (
            <div
              key={item.id}
              className="group rounded-4xl border border-border/70 bg-background/35 overflow-hidden"
            >
              <div className="relative h-28">
                <Image
                  src="/ref/hero-car.jpg"
                  alt=""
                  fill
                  className="object-cover opacity-45 group-hover:opacity-60 transition"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
              </div>
              <div className="p-4">
                <p className="whitespace-pre-line text-sm font-ui font-semibold">
                  {item.title}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs text-muted">
                  <span>@projetogaragem</span>
                  <span className="inline-flex items-center gap-1">
                    <Share2 className="size-3" /> {item.likes}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-4xl border border-border/70 bg-background/20">
        <div className="absolute inset-0">
          <Image
            src="/ref/car-black.jpg"
            alt=""
            fill
            className="object-cover object-right opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/25" />
        </div>

        <div className="relative p-5 md:p-6">
          <h3 className="font-title text-lg tracking-tight">Fique por dentro!</h3>
          <p className="mt-2 text-sm text-muted max-w-sm">
            Receba novidades, ofertas exclusivas e inspirações para o seu projeto.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <input
              className="h-11 flex-1 rounded-3xl border border-border/70 bg-black/35 px-4 text-sm text-foreground placeholder:text-muted outline-none focus:border-accent/45 focus:shadow-glow"
              placeholder="Seu melhor e-mail"
            />
            <Button className="sm:w-auto">Receber</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
