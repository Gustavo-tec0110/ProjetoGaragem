import { expect, test } from "./fixtures";

const widths = [360, 390, 768, 1024, 1440, 1920] as const;
const previews = ["perfil", "projeto", "editar-projeto", "evolucao", "modificacoes"] as const;

test.describe("skeletons de rotas dinâmicas", () => {
  test.skip(process.env.SKELETON_VISUAL_TEST !== "1", "Auditoria visual sob demanda.");

  test("rodapé fica oculto somente durante o fallback da página", async ({ page }) => {
    await page.goto("/dev-skeletons/explorar");
    await expect(page.locator("[data-page-skeleton]")).toBeVisible();
    await expect(page.locator("footer")).toBeHidden();
    await page.goto("/explorar");
    await expect(page.locator("[data-page-skeleton]")).toHaveCount(0);
    await expect(page.locator("footer")).toBeVisible();
  });

  for (const width of widths) {
    for (const preview of previews) {
      test(`${preview} em ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        const response = await page.goto(`/dev-skeletons/${preview}`, { waitUntil: "domcontentloaded" });
        expect(response?.status()).toBe(200);
        await expect(page.locator('[aria-busy="true"]')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      });
    }
  }
});
