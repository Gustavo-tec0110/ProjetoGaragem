import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Card } from "@/components/ui/card";
import { kitTeasers } from "@/lib/data/home";

export const metadata = {
  title: "Kits",
};

export default function KitsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl pt-20 md:pt-24 pb-12">
          <h1 className="font-title text-3xl md:text-4xl tracking-tight">
            Kits Compatíveis
          </h1>
          <p className="mt-2 text-muted max-w-2xl">
            Kits completos com peças que conversam entre si — o sistema bloqueia
            combinações ruins e te avisa com clareza.
          </p>

          <div className="mt-8 flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {kitTeasers.map((kit) => (
              <Card key={kit.id} className="p-5 sm:p-6 snap-start shrink-0 w-[86%] sm:w-auto">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted">Kit</p>
                    <h2 className="mt-1 font-title tracking-tight">{kit.name}</h2>
                    <p className="mt-2 text-sm text-muted">{kit.description}</p>
                  </div>
                  <div className="rounded-2xl bg-accent/10 border border-accent/30 px-3 py-2">
                    <p className="text-[10px] text-muted">Faixa</p>
                    <p className="text-sm font-semibold">{kit.priceRange}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
