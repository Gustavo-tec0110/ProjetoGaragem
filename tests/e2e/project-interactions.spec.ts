import { test, expect } from "./fixtures";

// All mutations below target localStorage or browser API stubs, never real accounts.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("projeto-garagem:cookie-consent", JSON.stringify({ version: 1, necessary: true, analytics: false, marketing: false, decidedAt: "2026-10-28T12:00:00Z" }));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value: string) => { document.documentElement.dataset.copiedUrl = value; } } });
    Object.defineProperty(navigator, "share", { configurable: true, value: async (value: ShareData) => { document.documentElement.dataset.sharedUrl = value.url; } });
  });
});

for (const width of [1440, 1024, 768, 390, 320]) {
  test(`${width}px: ações compactas, estado local, foco e catálogo`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/test-harness/project-overview?owner=1");
    await page.locator('[data-catalog-ready="true"]').waitFor({ state: "attached" });
    const actions = page.getByRole("group", { name: "Ações do projeto", exact: true });
    const controls = actions.locator("button, a");
    await expect(controls).toHaveCount(8);
    for (const control of await controls.all()) {
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    const like = actions.getByRole("button", { name: /^Curtir/ });
    await like.click();
    await expect(actions.getByRole("button", { name: "Curtido (1)", exact: true })).toHaveAttribute("aria-pressed", "true");
    await actions.getByRole("button", { name: /^Salvar/ }).click();
    await expect(actions.getByRole("button", { name: "Salvo (1)", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(actions.getByRole("button", { name: "Curtido (1)", exact: true })).toHaveAttribute("aria-pressed", "true");
    await actions.getByRole("button", { name: /^Curtido/ }).click();
    await actions.getByRole("button", { name: /^Salvo/ }).click();
    await expect(actions.getByRole("button", { name: "Curtir (0)", exact: true })).toHaveAttribute("aria-pressed", "false");
    const copy = actions.getByRole("button", { name: "Copiar link", exact: true });
    await copy.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveAttribute("data-copied-url", page.url());
    await expect(actions.getByRole("status")).toHaveText("Link copiado");
    await actions.getByRole("button", { name: "Compartilhar", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-shared-url", page.url());
    await expect(actions.getByRole("link", { name: "Editar ficha", exact: true })).toHaveAttribute("href", "/projeto/revisao-local/editar");
    await expect(actions.getByRole("link", { name: "Evolução", exact: true })).toHaveAttribute("href", "/projeto/revisao-local/evolucao");
    await expect(actions.getByRole("link", { name: "Comparar", exact: true })).toHaveAttribute("href", /comparar/);
    const part = page.getByRole("region", { name: "Modificações atuais", exact: true }).getByRole("button", { name: "Ver componente", exact: true }).first();
    await part.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Volante esportivo", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(part).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await actions.screenshot({ path: `artifacts/project-interactions/actions-${width}.png` });
    await page.goto("/test-harness/project-overview");
    await expect(actions.getByRole("link", { name: "Editar ficha", exact: true })).toHaveCount(0);
  });
}

test("hover, movimento reduzido e toque preservam feedback", async ({ page, browser }) => {
  await page.goto("/test-harness/project-overview?owner=1");
  const image = page.getByRole("button", { name: "Ver detalhes de Volante esportivo", exact: true });
  await image.hover();
  await expect.poll(() => image.evaluate(el => getComputedStyle(el).transform)).toBe("matrix(1.02, 0, 0, 1.02, 0, 0)");
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Chromium may serialize the neutral transform as an identity matrix.
  await expect(image).toHaveCSS("transform", /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  await expect(image).toHaveCSS("transition-duration", "0s");
  const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await touch.addInitScript(() => localStorage.setItem("projeto-garagem:cookie-consent", JSON.stringify({ version: 1, necessary: true, analytics: false, marketing: false, decidedAt: "2026-10-28T12:00:00Z" })));
  const mobile = await touch.newPage();
  await mobile.goto("/test-harness/project-overview?owner=1");
  await mobile.locator('[data-catalog-ready="true"]').waitFor({ state: "attached" });
  const like = mobile.getByRole("group", { name: "Interações sociais", exact: true }).getByRole("button", { name: /^Curti/ });
  await like.tap();
  await expect(like).toHaveAttribute("aria-pressed", "true");
  await expect(like).toHaveCSS("cursor", "pointer");
  const trigger = mobile.getByRole("button", { name: "Ver detalhes de Volante esportivo", exact: true });
  await trigger.tap();
  await expect(mobile.getByRole("dialog", { name: "Volante esportivo", exact: true })).toBeVisible();
  await touch.close();
});
