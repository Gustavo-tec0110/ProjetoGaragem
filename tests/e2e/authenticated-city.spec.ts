import { expect, test } from "./fixtures";
import { e2eUser, login, uniqueProjectName } from "./helpers";

test("cidade editada aparece no projeto e persiste após recarga", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!e2eUser.email || !e2eUser.password, "Conta E2E real não configurada.");
  const name = uniqueProjectName();
  await login(page, "/criar-projeto", e2eUser);
  await page.getByLabel("Nome do projeto").fill(name);
  const model = page.getByRole("combobox", { name: "Modelo", exact: true });
  await expect(async () => {
    await page.getByRole("combobox", { name: "Marca", exact: true }).selectOption("Volkswagen");
    await expect(model.locator('option[value="Gol"]')).toHaveCount(1, { timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
  await model.selectOption("Gol");
  await page.getByLabel("Ano").fill("1994");
  await page.getByRole("button", { name: /Criar projeto agora|Criar pagina do projeto|Criar página do projeto/i }).click();
  await expect(page).toHaveURL(/\/projeto\/[^/]+$/, { timeout: 30_000 });
  const projectUrl = page.url();

  await page.locator('a[href$="/editar"]').first().click();
  await page.getByLabel("Cidade").fill("Curitiba");
  await page.getByLabel("Estado").fill("PR");
  await page.getByRole("button", { name: /Salvar alteracoes|Salvar alterações/i }).click();
  await expect(page).toHaveURL(projectUrl, { timeout: 30_000 });
  const heroLocation = page.getByTestId("project-detail").first().getByText("Curitiba, PR", { exact: true });
  await expect(heroLocation).toBeVisible();
  await page.reload();
  await expect(heroLocation).toBeVisible();

  await page.goto(`${projectUrl}/editar`);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /Excluir projeto/i }).click();
  await expect(page).not.toHaveURL(/\/editar$/);
  await page.goto(projectUrl);
  await expect(page.getByRole("heading", { name: "Essa ficha nao esta mais na pista" })).toBeVisible();
});
