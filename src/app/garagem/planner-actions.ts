"use server";

import { requireSupabaseUser } from "@/lib/supabase/auth-server";
import { qCarsByOwner, qSavedCars } from "@/lib/supabase/queries";
import { getProjectCollection, getProjectsBySlugs } from "@/lib/projects/server";

export async function loadPrivateInspirationPlanner() {
  // Never accept a profile/owner ID from the client for this private tool.
  const { user } = await requireSupabaseUser();
  if (!user) throw new Error("Entre novamente para abrir o planejador.");
  const [cars, saved] = await Promise.all([qCarsByOwner(user.id, true), qSavedCars(user.id)]);
  if (cars.error || saved.error) throw new Error("Não foi possível carregar o planejador. Tente novamente.");
  const mySlugs = (cars.data ?? []).map((car) => car.slug);
  const savedSlugs = (saved.data ?? []).map((car) => car.slug);
  // Public fallback is needed only when the owner has no saved references.
  const references = savedSlugs.length ? savedSlugs
    : (await getProjectCollection(undefined, false)).allProjects
      .filter((project) => !mySlugs.includes(project.slug)).slice(0, 12).map((project) => project.slug);
  const [myProjects, referenceProjects] = await Promise.all([
    getProjectsBySlugs(mySlugs), getProjectsBySlugs(references),
  ]);
  return {
    storageScope: user.id, myProjects, referenceProjects,
    referenceSourceLabel: savedSlugs.length ? "Projetos salvos" : "Projetos em destaque",
  };
}
