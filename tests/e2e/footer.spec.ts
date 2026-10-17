import { expect, test } from "./fixtures";

test("footer responsivo preserva navegação, contato e preferências de cookies", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.goto("/terms");
  await page.getByRole("button", { name: "Recusar opcionais", exact: true }).click();
  const footer = page.getByRole("contentinfo");
  const routes = ["/explorar", "/atualizacoes", "/rankings", "/garagem", "/criar-projeto", "/privacy", "/terms"];
  await expect(footer.locator('a[href^="/"]')).toHaveCount(routes.length);
  for (const route of routes) {
    const link = footer.locator(`a[href="${route}"]`);
    await expect(link).toHaveCount(1);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${route}$`), { timeout: 30_000 });
    await page.goto("/terms");
  }
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const mainBounds = await page.locator("main").boundingBox();
    const footerBounds = await footer.boundingBox();
    expect(footerBounds!.y).toBeGreaterThanOrEqual(mainBounds!.y + mainBounds!.height - 1);
    await footer.screenshot({ path: testInfo.outputPath(`footer-${width}.png`) });
  }
  const email = "gustavo.sl.0110@gmail.com";
  await expect(footer.getByRole("link", { name: email })).toHaveAttribute("href", `mailto:${email}`);
  await footer.getByRole("button", { name: "Gerenciar cookies" }).click();
  await expect(page.getByRole("dialog", { name: "Preferências de cookies" })).toBeVisible();
  await page.getByRole("button", { name: "Salvar preferência" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("projeto-garagem:cookie-consent")!).necessary)).toBe(true);
  await footer.getByRole("link", { name: "Termos", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(footer.getByRole("button", { name: "Gerenciar cookies" })).toBeFocused();
  expect(await footer.getByRole("button", { name: "Gerenciar cookies" }).evaluate(el => getComputedStyle(el).outlineStyle)).toBe("solid");
  for (const route of ["/terms", "/privacy"]) {
    await page.goto(route);
    await expect(page.locator("main").getByRole("link", { name: email })).toHaveAttribute("href", `mailto:${email}`);
    await expect(page.locator("main")).not.toContainText("ggtopxbox1@gmail.com");
  }
});
