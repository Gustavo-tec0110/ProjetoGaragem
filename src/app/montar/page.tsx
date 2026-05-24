import { BuildPlanner } from "@/components/builder/build-planner";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { qCarsLite, qPartsLite } from "@/lib/supabase/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Montar Projeto",
};

export default async function MontarPage() {
  const supabase = await getSupabaseServerClient();

  const carsRes = supabase ? await qCarsLite(supabase) : null;
  const partsRes = supabase ? await qPartsLite(supabase) : null;

  const initialCars = carsRes?.data ?? [];
  const initialParts = partsRes?.data ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl pt-20 md:pt-24 pb-12">
          <BuildPlanner initialCars={initialCars} initialParts={initialParts} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

