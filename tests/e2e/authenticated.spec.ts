import { expect, test } from "@playwright/test";

import { hasE2EUser, login, uniqueProjectName } from "./helpers";

test.describe("fluxos autenticados Supabase", () => {
  test.skip(!hasE2EUser(), "Defina E2E_USER_EMAIL e E2E_USER_PASSWORD para rodar fluxos autenticados reais.");
  test.describe.configure({ mode: "serial" });

  let projectTitle = "";

  test("login, criar projeto, editar, curtir, salvar, comentar e ver notificacoes", async ({ page }) => {
    projectTitle = uniqueProjectName();

    await login(page, "/criar-projeto");
    await expect(page.getByRole("heading", { name: /Crie o projeto/i })).toBeVisible();

    await page.getByLabel("Nome do projeto").fill(projectTitle);
    await page.getByLabel("Marca").selectOption("Volkswagen");
    await page.getByLabel("Modelo").selectOption("Gol");
    await page.getByLabel("Ano").fill("1994");
    await page.getByRole("button", { name: /Criar projeto agora/i }).click();

    await page.waitForURL(/\/projeto\/[^/]+$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: new RegExp(projectTitle, "i") })).toBeVisible();

    await page.getByRole("link", { name: /Editar ficha|Completar detalhes|Editar informações/i }).first().click();
    await expect(page).toHaveURL(/\/editar$/);
    await page.locator('[name="description"]').fill("Projeto criado pelo E2E Beta 2 para validar edicao real.");
    await page.getByLabel("Cidade").fill("Curitiba");
    await page.getByLabel("Estado").fill("PR");
    await page.getByRole("button", { name: /Salvar alterações/i }).click();
    await page.waitForURL(/\/projeto\/[^/]+$/, { timeout: 30_000 });
    await expect(page.getByText("Curitiba")).toBeVisible();

    await page.getByRole("button", { name: /Curtir/i }).first().click();
    await expect(page.getByRole("button", { name: /Curtir/i }).first()).toBeVisible();
    await page.getByRole("button", { name: /Salvar/i }).first().click();
    await expect(page.getByRole("button", { name: /Salvar/i }).first()).toBeVisible();

    await page.getByPlaceholder(/Comente sobre/i).fill("Comentario E2E Beta 2");
    await page.getByRole("button", { name: /^Comentar$/ }).click();
    await expect(page.getByText("Comentario E2E Beta 2")).toBeVisible();

    await page.goto("/notificacoes");
    await expect(page.getByRole("heading", { name: /Notifica/i })).toBeVisible();
  });

  test("seguir projeto alvo quando um slug de terceiro for informado", async ({ page }) => {
    const targetSlug = process.env.E2E_TARGET_PROJECT_SLUG;
    test.skip(!targetSlug, "Defina E2E_TARGET_PROJECT_SLUG para validar seguir projeto de outro usuario.");

    await login(page, `/projeto/${targetSlug}`);
    await page.goto(`/projeto/${targetSlug}`);
    const follow = page.getByRole("button", { name: /Seguir/i }).first();
    await expect(follow).toBeVisible();
    await follow.click();
    await expect(page.getByRole("button", { name: /Seguindo|Seguir/i }).first()).toBeVisible();
  });
});
