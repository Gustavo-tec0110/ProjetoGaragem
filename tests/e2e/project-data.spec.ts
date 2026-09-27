import { expect, test } from "@playwright/test";

import { demoProjects } from "@/lib/projects/demo-projects";
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

test("normaliza facetas livres e nunca transforma texto de projeto em tracao", () => {
  expect(normalizeProjectFuel("GASOLINE")).toBe("Gasolina");
  expect(normalizeProjectFuel("álcool")).toBe("Etanol");
  expect(normalizeProjectInduction("compressor mecânico")).toBe("Supercharger");
  expect(normalizeProjectDrivetrain("dianteira")).toBe("FWD");
  expect(normalizeProjectDrivetrain("AWD")).toBe("AWD");
  expect(normalizeProjectDrivetrain("Subaru Impreza WRX Boxer AWD")).toBeNull();

  expect(normalizeProjectFilters({ fuel: "GASOLINE", drivetrain: "dianteira" })).toMatchObject({
    fuel: "Gasolina",
    drivetrain: "FWD",
  });
});

test("deduplica apenas a mesma identidade e preserva projetos iguais de donos diferentes", () => {
  const original = demoProjects[0];
  const duplicate = {
    ...original,
    source: "supabase" as const,
    databaseId: "car-1",
    ownerId: "owner-1",
    ownerUsername: "owner-1",
  };
  const sameCarAgain = { ...duplicate, likes: duplicate.likes + 10 };
  const sameTitleOtherOwner = {
    ...duplicate,
    databaseId: "car-2",
    slug: "gol-quadrado-1994-ap18-outro-dono",
    ownerId: "owner-2",
    ownerUsername: "owner-2",
  };

  const projects = uniqueProjects([original, duplicate, sameCarAgain, sameTitleOtherOwner]);

  expect(projects).toHaveLength(2);
  expect(projects.find((project) => project.databaseId === "car-1")?.likes).toBe(duplicate.likes);
  expect(projects.map((project) => project.ownerId)).toEqual(expect.arrayContaining(["owner-1", "owner-2"]));
});

test("facetas e filtros usam os valores canonicos do projeto, nao tags livres", () => {
  const [first, second] = demoProjects;
  const projects = [
    { ...first, fuelType: "Gasolina", factoryDrivetrain: "FWD", tags: ["#gasoline", "#Dianteira"] },
    { ...second, fuelType: "Gasolina", factoryDrivetrain: "AWD", tags: ["#GASOLINA", "#awd"] },
    {
      ...second,
      slug: "subaru-facet-invalida",
      fuelType: null,
      drivetrain: null,
      factoryDrivetrain: null,
      tags: ["#Subaru Impreza WRX Boxer AWD"],
    },
  ];

  expect(getAvailableFuels(projects)).toEqual(["Gasolina"]);
  expect(getAvailableDrivetrains(projects)).toEqual(["AWD", "FWD"]);
  expect(filterProjects(projects, normalizeProjectFilters({ drivetrain: "AWD" }))).toHaveLength(1);
});
