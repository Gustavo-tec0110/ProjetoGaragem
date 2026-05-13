"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Bolt,
  Layers,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { NumberTicker } from "@/components/motion/number-ticker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PremiumCard } from "@/components/ui/premium-card";

export function Hero() {
  const reduceMotion = useReducedMotion();

  const stats = [
    {
      label: "Builds criadas",
      value: 18420,
      icon: <Users className="size-4 text-accent" />,
    },
    {
      label: "Peças cadastradas",
      value: 8940,
      icon: <Layers className="size-4 text-accent" />,
    },
    {
      label: "Compatibilidades verificadas",
      value: 132_000,
      icon: <ShieldCheck className="size-4 text-accent" />,
    },
  ] as const;

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 pg-grid-bg" />

      <div className="absolute inset-0">
        <motion.div
          aria-hidden
          className="absolute inset-0"
          animate={
            reduceMotion
              ? undefined
              : {
                  scale: [1.04, 1.075, 1.04],
                  x: [0, -10, 0],
                  y: [0, 8, 0],
                }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 18, repeat: Infinity, ease: "easeInOut" }
          }
        >
          <Image
            src="/ref/hero-car.jpg"
            alt=""
            fill
            priority
            className="object-cover object-right opacity-55 blur-2xl scale-[1.08]"
          />
        </motion.div>

        <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/78 to-black/34" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/48" />
        <div className="absolute inset-0 pointer-events-none pg-particles opacity-35" />
        <div className="absolute inset-0 pointer-events-none pg-scanlines opacity-20" />
        <div
          className="absolute inset-0 pointer-events-none opacity-70 mix-blend-overlay"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(255,255,255,0.12), transparent 40%), linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.08) 35%, transparent 70%)",
          }}
        />

        <div className="absolute inset-0 opacity-45">
          <div className="absolute -top-28 left-1/2 -translate-x-1/2 size-[760px] rounded-full bg-accent/14 blur-3xl" />
          <div className="absolute -bottom-44 -left-32 size-[600px] rounded-full bg-accent-2/12 blur-3xl" />
          <div className="absolute top-16 -right-36 size-[560px] rounded-full bg-accent/10 blur-3xl" />
        </div>
      </div>

      <div className="relative px-4 sm:px-6 pt-24 pb-12 md:pb-16">
        <div className="mx-auto w-full max-w-6xl grid gap-10 lg:grid-cols-2 lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-2">
                <Sparkles className="size-3 text-accent" />
                Plataforma de tuning premium
              </Badge>
              <Badge variant="default" className="gap-2 border-accent/25 bg-black/35">
                <BadgeCheck className="size-3 text-accent" />
                Comunidade ativa
              </Badge>
            </div>

            <h1 className="mt-4 font-title text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.05]">
              Tuning com cara de jogo.
              <br />
              <span className="text-accent">Builds compatíveis</span> em segundos.
            </h1>

            <p className="mt-4 text-muted text-lg leading-relaxed max-w-xl">
              Monte setups com score dinâmico, métricas em tempo real e peças
              organizadas por categoria — pronto pra salvar, curtir e compartilhar.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg">
                <Link href="/montar">
                  Montar build <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/explorar">Explorar Builds</Link>
              </Button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {stats.map((s) => (
                <PremiumCard key={s.label} className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-9 items-center justify-center rounded-3xl border border-border/70 bg-background/35 shadow-glow">
                      {s.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-muted truncate">{s.label}</p>
                      <p className="mt-0.5 font-title tracking-tight">
                        <NumberTicker
                          value={s.value}
                          format={(v) => Math.round(v).toLocaleString("pt-BR")}
                        />
                        +
                      </p>
                    </div>
                  </div>
                </PremiumCard>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.05, ease: [0.2, 0.8, 0.2, 1] }}
            className="lg:justify-self-end"
          >
            <PremiumCard className="relative overflow-hidden w-full max-w-xl">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "radial-gradient(900px circle at 20% 10%, rgba(255,77,0,0.28), transparent 55%), radial-gradient(900px circle at 80% 35%, rgba(255,123,0,0.18), transparent 55%), linear-gradient(135deg, rgba(26,27,34,0.92), rgba(17,18,22,0.90))",
                }}
              />
              <div className="absolute inset-0 pointer-events-none pg-scanlines opacity-22" />
              <div className="absolute inset-0 pointer-events-none pg-particles opacity-50" />

              <div className="relative p-6 md:p-7">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted">Preview da build</p>
                    <h2 className="mt-1 font-title text-xl tracking-tight">
                      Civic G8 • Turbo Street
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      Compatibilidade:{" "}
                      <span className="text-foreground font-semibold">92%</span>
                    </p>
                  </div>
                  <div className="rounded-3xl border border-accent/30 bg-accent/10 px-4 py-2 shadow-glow">
                    <p className="text-[10px] text-muted">Orçamento</p>
                    <p className="text-sm font-semibold">R$ 12.000</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {[
                    { k: "Rodas", v: "18” • offset +35" },
                    { k: "Suspensão", v: "Coilover street" },
                    { k: "Escape", v: "Catback inox" },
                    { k: "Intake", v: "Cold air intake" },
                    { k: "Bodykit", v: "Lip + side skirts" },
                    { k: "Som", v: "Kit premium compacto" },
                  ].map((item) => (
                    <div
                      key={item.k}
                      className="rounded-3xl border border-border/70 bg-background/35 px-4 py-3"
                    >
                      <p className="text-xs text-muted">{item.k}</p>
                      <p className="mt-1 text-sm font-semibold">{item.v}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-4xl border border-border/70 bg-background/30 p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-ui font-semibold tracking-tight">
                      Alertas de compatibilidade
                    </p>
                    <Badge variant="secondary">1 aviso</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    Pneu com perfil baixo pode raspar em rebaixamento agressivo. Ajuste
                    para evitar atrito.
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Score",
                      value: 87,
                      icon: <Sparkles className="size-4 text-accent" />,
                      suffix: "%",
                    },
                    {
                      label: "Popularidade",
                      value: 1842,
                      icon: <Bolt className="size-4 text-accent" />,
                      suffix: "",
                    },
                  ].map((it) => (
                    <div
                      key={it.label}
                      className="rounded-4xl border border-border/70 bg-background/25 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-muted">{it.label}</p>
                        <span className="inline-flex size-9 items-center justify-center rounded-3xl border border-border/70 bg-background/35">
                          {it.icon}
                        </span>
                      </div>
                      <p className="mt-2 font-title tracking-tight">
                        <NumberTicker
                          value={it.value}
                          format={(v) => Math.round(v).toLocaleString("pt-BR")}
                        />
                        {it.suffix}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </PremiumCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
