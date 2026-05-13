import { cars } from "@/lib/data/home";
import { Badge } from "@/components/ui/badge";
import { PremiumCard } from "@/components/ui/premium-card";

export function PopularCars() {
  return (
    <section className="px-4 sm:px-6 py-10 md:py-14">
      <div className="mx-auto w-full max-w-6xl">
        <div>
          <p className="text-xs text-muted">Base de carros</p>
          <h2 className="mt-2 font-title text-2xl md:text-3xl tracking-tight">
            Carros populares
          </h2>
          <p className="mt-2 text-muted max-w-2xl">
            Potência, consumo, problemas crônicos e custo médio — pronto pra virar uma
            página completa por modelo.
          </p>
        </div>

        <div className="mt-6 flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible sm:grid sm:grid-cols-2 lg:grid-cols-3">
          {cars.map((car) => (
            <PremiumCard
              key={car.id}
              className="relative overflow-hidden p-5 sm:p-6 snap-start shrink-0 w-[82%] sm:w-auto"
            >
              <div
                className="absolute inset-0 opacity-85"
                style={{
                  backgroundImage:
                    "radial-gradient(900px circle at 20% 10%, rgba(255,77,0,0.12), transparent 60%), linear-gradient(135deg, rgba(26,27,34,0.90), rgba(17,18,22,0.92))",
                }}
              />
              <div className="absolute inset-0 pointer-events-none pg-scanlines opacity-14" />
              <div className="absolute inset-0 pointer-events-none pg-particles opacity-28" />

              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted">Carro</p>
                  <h3 className="mt-1 font-title tracking-tight">{car.name}</h3>
                  <p className="mt-2 text-sm text-muted">{car.power}</p>
                </div>
                <Badge variant="secondary">{car.segment}</Badge>
              </div>

              <div className="relative mt-5 grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Consumo</span>
                  <span className="font-semibold">{car.fuelConsumption}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Custo médio</span>
                  <span className="font-semibold">{car.avgProjectCost}</span>
                </div>
              </div>

              <div className="relative mt-5 rounded-3xl border border-border/70 bg-background/35 p-4">
                <p className="text-xs text-muted">Problemas crônicos</p>
                <p className="mt-2 text-sm text-muted">{car.commonIssues}</p>
              </div>
            </PremiumCard>
          ))}
        </div>
      </div>
    </section>
  );
}
