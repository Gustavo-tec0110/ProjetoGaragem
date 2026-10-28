import { test, expect } from "./fixtures";
import definitions from "../../src/lib/modifications/catalog-definitions.json";
import assets from "../../src/lib/modifications/catalog-assets.json";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("projeto-garagem:cookie-consent", JSON.stringify({
    version: 1, necessary: true, analytics: false, marketing: false, decidedAt: "2026-10-27T12:00:00Z",
  })));
});

const selectableCount = definitions.filter((item) => !item.selectionAliasOf).length;

test("catálogo expandido permite pesquisar, combinar filtros e selecionar peças novas", async ({ page }, testInfo) => {
  await page.goto("/test-harness/catalog");
  await page.locator('[data-catalog-ready="true"]').waitFor({ state: "attached" });
  await page.getByRole("button", { name: "Adicionar modificação" }).click();
  const dialog = page.getByRole("dialog");
  const search = dialog.getByRole("searchbox", { name: "Buscar peça" });
  await expect(dialog.getByLabel("Resultados do catálogo")).toHaveText(`${selectableCount} peças encontradas`);
  await expect(dialog.getByLabel("Peças do catálogo").locator("button[aria-pressed]")).toHaveCount(40);
  await expect(dialog.getByRole("button", { name: /Mostrar mais peças/ })).toBeVisible();
  await dialog.getByRole("button", { name: /Mostrar mais peças/ }).click();
  await expect(dialog.getByRole("button", { name: /80 de/ })).toBeVisible();
  await expect(dialog.getByLabel("Peças do catálogo").locator("button[aria-pressed]")).toHaveCount(80);
  await search.fill("suspensao a ar");
  const part = dialog.getByRole("button", { name: /Suspensão a ar Suspensão/ });
  await expect(part).toBeVisible();
  await part.click();
  await expect(part).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.getByRole("button", { name: "Adicionar modificação", exact: true })).toBeEnabled();
  await dialog.getByRole("navigation", { name: "Categorias de peças" }).getByRole("button", { name: "Freios", exact: true }).click();
  await expect(dialog.getByText("Nenhuma peça encontrada. Tente outro termo ou categoria.")).toBeVisible();
  await dialog.getByRole("button", { name: "Limpar filtros" }).click();
  await search.fill("turbina");
  await expect(dialog.getByRole("button", { name: /Turbocompressor Motor/ })).toBeVisible();
  await search.fill("blow off");
  await expect(dialog.getByRole("button", { name: "Válvula blow-off Motor / Performance", exact: true })).toBeVisible();
  await search.fill("");
  await dialog.getByRole("navigation", { name: "Categorias de peças" }).getByRole("button", { name: "Motor / Performance", exact: true }).click();
  await expect(dialog.getByLabel("Resultados do catálogo")).toHaveText("67 peças encontradas");
  // Scroll each horizontal category control into view, then return to All.
  for (const button of await dialog.getByRole("navigation").getByRole("button").all()) {
    await button.scrollIntoViewIfNeeded();
    await expect(button).toBeVisible();
  }
  await dialog.getByRole("navigation").getByRole("button", { name: "Todas", exact: true }).click();
  await search.fill("radiador");
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
  // The editor must escape the animated route's stacking context and cover both nav bars.
  expect(await dialog.evaluate((element) => element.parentElement === document.body)).toBe(true);
  for (const img of await dialog.locator("img").all()) {
    await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `docs/garagem-afiliados-2026-10-27/catalogo-${testInfo.project.name}.png`, fullPage: false });
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
});

test("registro legado duplicado continua visível e editável", async ({ page }) => {
  await page.goto("/test-harness/catalog");
  await page.locator('[data-catalog-ready="true"]').waitFor({ state: "attached" });
  await expect(page.getByRole("heading", { name: "Suspensão a rosca", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("searchbox").fill("rosca");
  await expect(dialog.getByRole("button", { name: /Suspensão a rosca Suspensão/ })).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.getByRole("button", { name: "Salvar alterações" })).toBeEnabled();
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
});

test("todas as fotografias aprovadas e suas variantes otimizadas carregam localmente", async ({ request }) => {
  const paths = [...new Set(Object.values(assets).map((asset) => asset.image).filter((image): image is string => Boolean(image)))];
  for (const path of paths) {
    const original = await request.get(path);
    expect(original.status(), path).toBe(200);
    expect(original.headers()["content-type"], path).toContain("image/webp");
    const optimized = await request.get(`/_next/image?url=${encodeURIComponent(path)}&w=96&q=75`, { headers: { Accept: "image/webp" } });
    expect(optimized.status(), `optimized ${path}`).toBe(200);
    expect(optimized.headers()["content-type"]).toMatch(/image\/(webp|avif)/);
  }
  expect((await request.get("/modifications/photo-credits.html")).status()).toBe(200);
  expect((await request.get("/modifications/photo-credits-v1.html")).status()).toBe(200);
});
