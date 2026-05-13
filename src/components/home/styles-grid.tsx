"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Flame } from "lucide-react";

import { styles } from "@/lib/data/home";
import { PremiumCard } from "@/components/ui/premium-card";

export function StylesGrid() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="px-4 sm:px-6 py-10 md:py-14">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-xs text-muted">Escolha a vibe</p>
            <h2 className="mt-2 font-title text-2xl md:text-3xl tracking-tight">
              Estilos automotivos
            </h2>
            <p className="mt-2 text-muted max-w-2xl">
              Cards gigantes, profundidade, brilho laranja e hover fluido — do JDM
              ao OEM+.
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible sm:grid sm:grid-cols-2 lg:grid-cols-3">
          {styles.map((style) => (
            <motion.div
              key={style.id}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.65, ease: [0.2, 0.8, 0.2, 1] }
              }
              className="h-full snap-start shrink-0 w-[82%] sm:w-auto"
            >
              <PremiumCard className="relative overflow-hidden h-full">
                <div
                  className="absolute inset-0"
                  style={{ backgroundImage: style.backdrop }}
                />
                <div className="absolute inset-0 bg-background/55" />
                <div className="relative p-5 sm:p-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs text-foreground shadow-glow">
                    <Flame className="size-3 text-accent" />
                    {style.badge}
                  </div>
                  <h3 className="mt-4 font-title text-xl tracking-tight">
                    {style.label}
                  </h3>
                  <p className="mt-2 text-sm text-muted">{style.tagline}</p>

                  <div className="mt-5 h-px w-full bg-border/70" />
                  <p className="mt-4 text-sm text-muted">
                    Kits compatíveis prontos para montar e compartilhar.
                  </p>
                </div>
              </PremiumCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
