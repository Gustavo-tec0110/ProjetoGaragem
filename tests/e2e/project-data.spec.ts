import { expect, test } from "@playwright/test";

import { enrichProject } from "@/lib/projects/utils";
import {
  filterProjects,
  getAvailableDrivetrains,
  getAvailableFuels,
  normalizeProjectDrivetrain,
  normalizeProjectFilters,
  normalizeProjectFuel,
  normalizeProjectInduction,
  uniqueProjects,
} from "@/lib/projects/utils";

function projectFixture() {
  return enrichProject({
    id: "project-a", slug: "project-a", source: "supabase", databaseId: "car-1",
    ownerId: "owner-1", ownerName: "Owner 1", ownerUsername: "owner-1",
    title: "Projeto de teste", carModel: "Modelo de teste", brand: "Marca", model: "Modelo", year: 2020,
    engine: "Motor", style: "Rua", shortDescription: "Projeto usado somente em testes unitários.",
    description: "Projeto usado somente em testes unitários.", mainImage: "/ref/hero-car.jpg", gallery: ["/ref/hero-car.jpg"],
    installedParts: [], plannedParts: [], estimatedCost: null, likes: 0, saves: 0, views: 0, comments: 0, tags: [],
    city: null, state: null, createdAt: "2026-06-15T00:30:00.000Z", updatedAt: "2026-06-15T00:30:00.000Z",
    isPublic: true, viewerHasLiked: false, viewerHasSaved: false, editHref: null,
  });
}

test("normaliza facetas livres e nunca transforma texto de projeto em tracao", () => {
  expect(normalizeProjectFuel("GASOLINE")).toBe("Gasolina");
  expect(normalizeProjectFuel("álcool")).toBe("Etanol");
  expect(normalizeProjectInduction("compressor mecânico")).toBe("Supercharger");
  expect(normalizeProjectDrivetrain("dianteira")).toBe("FWD");
  expect(normalizeProjectDrivetrain("AWD")).toBe("AWD");
  expect(normalizeProjectDrivetrain("descrição AWD do veículo")).toBeNull();
  expect(normalizeProjectFilters({ fuel: "GASOLINE", drivetrain: "dianteira" })).toMatchObject({ fuel: "Gasolina", drivetrain: "FWD" });
});

test("deduplica apenas a mesma identidade e preserva projetos iguais de donos diferentes", () => {
  const original = projectFixture();
  const sameCarAgain = { ...original, likes: 10 };
  const sameTitleOtherOwner = { ...original, id: "project-b", databaseId: "car-2", slug: "project-b", ownerId: "owner-2", ownerUsername: "owner-2" };
  const projects = uniqueProjects([original, sameCarAgain, sameTitleOtherOwner]);
  expect(projects).toHaveLength(2);
  expect(projects.find((project) => project.databaseId === "car-1")?.likes).toBe(0);
  expect(projects.map((project) => project.ownerId)).toEqual(expect.arrayContaining(["owner-1", "owner-2"]));
});

test("facetas e filtros usam os valores canonicos do projeto, nao tags livres", () => {
  const first = { ...projectFixture(), fuelType: "Gasolina", factoryDrivetrain: "FWD", tags: ["#gasoline", "#Dianteira"] };
  const second = { ...projectFixture(), id: "project-b", databaseId: "car-2", slug: "project-b", fuelType: "Gasolina", factoryDrivetrain: "AWD", tags: ["#GASOLINA", "#awd"] };
  const invalid = { ...second, id: "project-c", databaseId: "car-3", slug: "project-c", fuelType: null, drivetrain: null, factoryDrivetrain: null, tags: ["#descrição AWD do veículo"] };
  const projects = [first, second, invalid];
  expect(getAvailableFuels(projects)).toEqual(["Gasolina"]);
  expect(getAvailableDrivetrains(projects)).toEqual(["AWD", "FWD"]);
  expect(filterProjects(projects, normalizeProjectFilters({ drivetrain: "AWD" }))).toHaveLength(1);
});
