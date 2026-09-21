import { expect, test } from "@playwright/test";

import { demoProjects } from "@/lib/projects/demo-projects";
import {
  formatProjectDate,
  getAvailableDrivetrains,
  getAvailableFuels,
  getAvailableInductions,
  selectProjectCatalog,
  uniqueProjects,
} from "@/lib/projects/utils";

test("datas de projeto são formatadas em UTC e não mudam no limite do dia", () => {
  expect(formatProjectDate("2026-06-15T00:30:00.000Z")).toBe("15/06/2026");
  expect(formatProjectDate("2026-06-15")).toBe("15/06/2026");
});

test("catálogo real substitui demos e fallback não mistura as fontes", () => {
  const real = { ...demoProjects[0], id: "real-a", databaseId: "real-a", source: "supabase" as const };
  expect(selectProjectCatalog([real], demoProjects)).toEqual([real]);
  expect(selectProjectCatalog([], demoProjects)).toEqual(uniqueProjects(demoProjects));
});

test("deduplicação preserva carros semelhantes de donos diferentes", () => {
  const first = {
    ...demoProjects[0],
    id: "project-a",
    databaseId: "project-a",
    ownerId: "owner-a",
    source: "supabase" as const,
  };
  const second = {
    ...first,
    id: "project-b",
    databaseId: "project-b",
    ownerId: "owner-b",
  };
  expect(uniqueProjects([first, second])).toHaveLength(2);
});

test("facetas automotivas são canônicas e descartam valores inválidos", () => {
  const project = {
    ...demoProjects[0],
    id: "facets",
    databaseId: "facets",
    source: "supabase" as const,
    fuelType: "Gasolina / Álcool",
    currentInduction: "injeção eletrônica aspirada",
    drivetrain: "tração traseira",
    factoryDrivetrain: "valor inválido",
    tags: ["#qualquer-coisa", "#gasolina", "#rwd"],
  };

  expect(getAvailableFuels([project])).toEqual(["Flex"]);
  expect(getAvailableInductions([project])).toEqual(["Aspirado"]);
  expect(getAvailableDrivetrains([project])).toEqual(["RWD"]);
});
