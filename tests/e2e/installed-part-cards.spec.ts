import { test, expect } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("projeto-garagem:cookie-consent", JSON.stringify({ version: 1, necessary: true, analytics: false, marketing: false, decidedAt: "2026-10-28T12:00:00Z" })));
});

for (const width of [1440, 1024, 768, 390, 320]) {
  test(`${width}px: cards compactos, imagens inteiras e acesso ao catálogo`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/test-harness/project-overview");
    await page.locator('[data-catalog-ready="true"]').waitFor({ state: "attached" });
    const section = page.getByRole("region", { name: "Modificações atuais", exact: true });
    await expect(page.locator("#modificacoes").getByText("2 itens", { exact: true })).toBeVisible();
    await expect(page.locator("#modificacoes").getByRole("heading", { level: 2 })).toHaveCount(1);
    await expect(section.getByRole("heading", { name: "Modificações atuais", exact: true })).toHaveCount(0);
    await expect(section.getByText("1 item", { exact: true })).toHaveCount(2);
    await expect(section.getByText("1 itens", { exact: true })).toHaveCount(0);
    const cards = section.locator(".pg-installed-part");
    await expect(cards).toHaveCount(2);
    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();
    expect(first!.x).toBe(second!.x);
    expect(second!.y).toBeGreaterThan(first!.y + first!.height);
    for (const card of await cards.all()) {
      await expect(card).toHaveCSS("cursor", "auto");
      const image = card.getByRole("img");
      await expect(image).toHaveCSS("object-fit", "contain");
      await expect.poll(() => image.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      const frame = card.getByRole("button", { name: /^Ver detalhes/ });
      const frameBox = await frame.boundingBox();
      expect(frameBox!.width).toBe(width >= 1024 ? 100 : 96);
      expect(Math.abs(frameBox!.height - frameBox!.width)).toBeLessThan(1);
      const button = card.getByRole("button", { name: "Ver componente", exact: true });
      await expect(button).toHaveCSS("cursor", "pointer");
      await expect(button).toHaveCSS("background-color", "rgb(27, 30, 37)");
      const box = await button.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      const content = await card.locator(".pg-installed-part-content").boundingBox();
      if (width >= 640) {
        expect(content!.x).toBeGreaterThan(frameBox!.x + frameBox!.width);
        expect(box!.x).toBeGreaterThan(content!.x + content!.width - 1);
      } else {
        expect(content!.y).toBeGreaterThan(frameBox!.y + frameBox!.height);
        expect(box!.y).toBeGreaterThan(content!.y + content!.height);
      }
      await expect(card.getByText("Instalada", { exact: true })).toBeVisible();
      await expect(card.getByText("Instalada em 27/10/2026", { exact: true })).toBeVisible();
    }
    const button = cards.first().getByRole("button", { name: "Ver componente", exact: true });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Volante esportivo", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(button).toBeFocused();
    // The photo and the explicit button must open the same catalog item.
    await cards.first().getByRole("button", { name: /^Ver detalhes/ }).click();
    await expect(page.getByRole("dialog", { name: "Volante esportivo", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.mouse.move(1, 1);
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
    await section.screenshot({ path: `artifacts/installed-part-cards-reference/section-${width}.png` });
  });
}

test("botão tem hover, foco e feedback sem movimento reduzido", async ({ page }) => {
  await page.goto("/test-harness/project-overview");
  const button = page.getByRole("region", { name: "Modificações atuais", exact: true }).getByRole("button", { name: "Ver componente", exact: true }).first();
  await button.hover();
  await expect(button).toHaveCSS("background-color", "rgb(37, 40, 50)");
  await expect(button).toHaveCSS("translate", "0px -1px");
  await button.focus();
  await expect(button).toBeFocused();
  await expect(button).not.toHaveCSS("box-shadow", "none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(button).toHaveCSS("translate", "none");
  await expect(button).toHaveCSS("transition-duration", "0s");
});

test("toque abre o componente correto sem exigir hover", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await context.addInitScript(() => localStorage.setItem("projeto-garagem:cookie-consent", JSON.stringify({ version: 1, necessary: true, analytics: false, marketing: false, decidedAt: "2026-10-28T12:00:00Z" })));
  const page = await context.newPage();
  try {
    await page.goto("/test-harness/project-overview");
    await page.locator('[data-catalog-ready="true"]').waitFor({ state: "attached" });
    const button = page.getByRole("region", { name: "Modificações atuais", exact: true }).getByRole("button", { name: "Ver componente", exact: true }).last();
    await expect(button).toHaveCSS("background-color", "rgb(27, 30, 37)");
    await button.tap();
    await expect(page.getByRole("dialog", { name: "Radiador de arrefecimento", exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});
