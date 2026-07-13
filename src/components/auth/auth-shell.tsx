import type { ReactNode } from "react";
import { Gauge, ShieldCheck, Wrench } from "lucide-react";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar />
      <main className="px-4 pb-8 pt-20 sm:px-6 md:pb-12 md:pt-28">
        <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-2xl border border-border/60 bg-card/65 shadow-elevated lg:min-h-[39rem] lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="relative hidden overflow-hidden border-r border-border/60 bg-background-2 p-10 lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:48px_48px]" />
            <div className="absolute -left-24 top-1/3 size-72 rounded-full bg-accent/15 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <p className="pg-eyebrow">Acesso à garagem</p>
              <h2 className="mt-4 font-title text-4xl leading-tight tracking-tight">
                Sua garagem continua daqui.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-6 text-muted">
                Entre para manter projetos, referências e interações organizados em um só lugar.
              </p>
            </div>
            <div className="relative grid gap-4">
              {[
                { icon: Wrench, label: "Projetos documentados" },
                { icon: Gauge, label: "Evolução sob controle" },
                { icon: ShieldCheck, label: "Perfil e garagem conectados" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 border-t border-border/60 pt-4 text-sm font-ui font-semibold">
                  <Icon className="size-4 text-accent" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </aside>

          <section className="flex items-center p-5 sm:p-8 lg:p-12">
            <div className="mx-auto w-full max-w-md">
              <p className="pg-eyebrow">{eyebrow}</p>
              <h1 className="mt-3 font-title text-3xl tracking-tight md:text-4xl">{title}</h1>
              <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
              <div className="mt-7">{children}</div>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
