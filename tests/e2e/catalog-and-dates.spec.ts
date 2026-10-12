import { expect, test } from "@playwright/test";

import { enrichProject } from "@/lib/projects/utils";
import {
  formatProjectDate,
  getAvailableDrivetrains,
  getAvailableFuels,
  getAvailableInductions,
  uniqueProjects,
} from "@/lib/projects/utils";

function projectFixture() {
  return enrichProject({
    id: "project-a", slug: "project-a", source: "supabase", databaseId: "project-a",
    ownerId: "owner-a", ownerName: "Owner A", ownerUsername: "owner-a",
    title: "Projeto de teste", carModel: "Modelo de teste", brand: "Marca", model: "Modelo", year: 2020,
    engine: "Motor", style: "Rua", shortDescription: "Projeto usado somente em testes unitários.",
    description: "Projeto usado somente em testes unitários.", mainImage: "/ref/hero-car.jpg", gallery: ["/ref/hero-car.jpg"],
    installedParts: [], plannedParts: [], estimatedCost: null, likes: 0, saves: 0, views: 0, comments: 0, tags: [],
    city: null, state: null, createdAt: "2026-06-15T00:30:00.000Z", updatedAt: "2026-06-15T00:30:00.000Z",
    isPublic: true, viewerHasLiked: false, viewerHasSaved: false, editHref: null,
  });
}

test("datas de projeto são formatadas em UTC e não mudam no limite do dia", () => {
  expect(formatProjectDate("2026-06-15T00:30:00.000Z")).toBe("15/06/2026");
  expect(formatProjectDate("2026-06-15")).toBe("15/06/2026");
});

test("deduplicação preserva carros semelhantes de donos diferentes", () => {
  const first = projectFixture();
  const second = { ...first, id: "project-b", databaseId: "project-b", slug: "project-b", ownerId: "owner-b" };
  expect(uniqueProjects([first, second])).toHaveLength(2);
});

test("facetas automotivas são canônicas e descartam valores inválidos", () => {
  const project = { ...projectFixture(), fuelType: "Gasolina / Álcool", currentInduction: "injeção eletrônica aspirada", drivetrain: "tração traseira", factoryDrivetrain: "valor inválido", tags: ["#qualquer-coisa", "#gasolina", "#rwd"] };
  expect(getAvailableFuels([project])).toEqual(["Flex"]);
  expect(getAvailableInductions([project])).toEqual(["Aspirado"]);
  expect(getAvailableDrivetrains([project])).toEqual(["RWD"]);
});
