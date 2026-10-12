import { expect, test } from "./fixtures";

test("página de modificações integra-se a um projeto publicado", async ({ page }) => {
  await page.goto("/explorar");
  const projectLink = page.locator('[data-testid="project-card"] a[href^="/projeto/"]').first();
  test.skip(await projectLink.count() === 0, "Requer ao menos um projeto publicado no catálogo.");
  const projectHref = await projectLink.getAttribute("href");
  expect(projectHref).toBeTruthy();

  const response = await page.goto(`${projectHref}/modificacoes`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Modificações" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Voltar ao projeto" })).toHaveAttribute("href", projectHref!);
  await expect(page.getByText("Documente o que já foi instalado", { exact: false })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  expect(hasHorizontalOverflow).toBe(false);
});
