import { expect, test } from "@playwright/test";

test("navegacao publica abre um projeto e valida interacoes de visitante", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation")).toBeVisible();

  await page.goto("/explorar");
  await expect(page.getByRole("heading", { name: "Explorar projetos" })).toBeVisible();

  await page.getByRole("link", { name: "Abrir" }).first().click();
  await expect(page).toHaveURL(/\/projeto\/[^/]+/);
  await expect(page.getByRole("button", { name: /Curtir/i })).toBeVisible();

  const likeButton = page.getByRole("button", { name: /Curtir/i }).first();
  await likeButton.click();
  const loginDialog = page.getByRole("dialog");
  if (await loginDialog.isVisible()) {
    await expect(loginDialog).toContainText(/Entre/i);
    await loginDialog.getByRole("button", { name: "Fechar" }).click();
    await expect(loginDialog).toBeHidden();
  } else {
    await expect(page.getByRole("button", { name: /Curtir/i }).first()).toBeVisible();
  }

  await expect(page.getByText(/Entre na sua conta para comentar|Nenhum comentario ainda|Comente sobre/i)).toBeVisible();
});

test("rotas protegidas orientam visitante para login ou modo local", async ({ page }) => {
  await page.goto("/criar-projeto");
  await expect(
    page.getByRole("heading", { name: /Entrar no Projeto Garagem|Entre para criar seu projeto|Crie o projeto/i })
  ).toBeVisible();

  await page.goto("/notificacoes");
  await expect(page.getByRole("heading", { name: "Notificações", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Entre para ver notificações" })).toBeVisible();
});
