import { expect, test } from "@playwright/test";

test("navegacao publica abre um projeto e valida interacoes de visitante", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation")).toBeVisible();

  await page.goto("/explorar");
  await expect(page.getByRole("heading", { name: "Explorar projetos" })).toBeVisible();

  await page.goto("/projeto/gol-quadrado-1994-ap18");
  await expect(page).toHaveURL(/\/projeto\/[^/]+/);
  await expect(page.getByRole("button", { name: /Curtir/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mostre este build para alguem" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Compartilhar projeto" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Continue navegando" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Mais projetos da mesma marca|Projetos semelhantes|Outros projetos populares/ }).first()
  ).toBeVisible();

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

  const commentPrompt = page
    .getByText(/Entre na sua conta para comentar|Nenhum comentario ainda|Comente sobre/i)
    .first();
  if (await commentPrompt.count()) {
    await expect(commentPrompt).toBeVisible();
  } else {
    await expect(page.getByRole("link", { name: /Coment/i })).toBeVisible();
  }
});

test("busca inteligente mostra sugestoes e preserva filtros na exploracao", async ({ page }) => {
  await page.goto("/explorar");

  await page.getByLabel("Buscar projetos").fill("Gol");
  const firstSuggestion = page.getByRole("option").first();
  await expect(firstSuggestion).toBeVisible();
  await firstSuggestion.click();
  await expect(page).toHaveURL(/\/projeto\//);

  await page.goto("/explorar?q=turbo&sort=likes");
  await expect(page.getByRole("heading", { name: "Explorar projetos" })).toBeVisible();
  await expect(page.getByLabel("Buscar projetos")).toHaveValue("turbo");
  await expect(page.getByLabel("Ordenar projetos")).toHaveValue("likes");
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
