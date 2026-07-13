import type { Locator } from "@playwright/test";

import { expect, test } from "./fixtures";

import {
  e2eSecondUser,
  e2eUser,
  hasAuthenticatedE2EUsers,
  login,
  logout,
  uniqueProjectName,
} from "./helpers";

const pngPixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/axnXwAAAABJRU5ErkJggg==",
  "base64"
);

async function socialCount(button: Locator) {
  const label = (await button.getAttribute("aria-label")) ?? (await button.innerText());
  const match = label.match(/(\d[\d.]*)/);
  if (!match) throw new Error(`Contador social ausente em: ${label}`);
  return Number.parseInt(match[1].replaceAll(".", ""), 10);
}

test.describe("fluxos autenticados Supabase", () => {
  test.skip(
    !hasAuthenticatedE2EUsers(),
    "Defina E2E_USER_EMAIL/E2E_USER_PASSWORD e E2E_SECOND_USER_EMAIL/E2E_SECOND_USER_PASSWORD para rodar fluxos autenticados reais."
  );
  test.describe.configure({ mode: "serial" });

  let projectTitle = "";
  let projectSlug = "";
  let ownerProfileHref = "";
  let initialFollowCount = 0;
  let initialLikeCount = 0;
  let initialSaveCount = 0;

  test("usuario principal faz login, acessa garagem, cria projeto, faz upload, edita e sai", async ({ page }) => {
    projectTitle = uniqueProjectName();

    await login(page, "/garagem", e2eUser);
    await expect(page.getByRole("heading", { name: /Garagem|Entrar|perfil/i }).first()).toBeVisible();
    await page.reload();
    await expect(page).not.toHaveURL(/\/login/);

    await page.goto("/criar-projeto");
    await expect(page.getByRole("heading", { name: /Crie o projeto/i })).toBeVisible();
    const projectName = page.getByLabel("Nome do projeto");
    await page.getByRole("button", { name: /Criar projeto agora|Criar pagina do projeto|Criar página do projeto/i }).click();
    await expect(page).toHaveURL(/\/criar-projeto/);
    await expect(projectName).toBeFocused();
    await projectName.fill(projectTitle);
    const brandSelect = page.getByRole("combobox", { name: "Marca", exact: true });
    const modelSelect = page.getByRole("combobox", { name: "Modelo", exact: true });

    await brandSelect.selectOption("Volkswagen");
    await expect(modelSelect.locator('option[value="Gol"]')).toHaveCount(1);
    await modelSelect.selectOption("Gol");

    await brandSelect.selectOption("Chevrolet");
    await expect(modelSelect).toHaveValue("");
    await expect(modelSelect.locator('option[value="Corsa"]')).toHaveCount(1);

    await brandSelect.selectOption("Fiat");
    await expect(modelSelect).toHaveValue("");
    await expect(modelSelect.locator('option[value="Uno"]')).toHaveCount(1);

    await brandSelect.selectOption("Ford");
    await expect(modelSelect).toHaveValue("");
    await expect(modelSelect.locator('option[value="Escort"]')).toHaveCount(1);

    await modelSelect.selectOption("__other__");
    await page.getByPlaceholder("Digite o modelo").fill("Modelo manual E2E");
    await brandSelect.selectOption("Volkswagen");
    await expect(modelSelect).toHaveValue("");
    await expect(page.getByPlaceholder("Digite o modelo")).toHaveCount(0);
    await modelSelect.selectOption("Gol");
    await page.getByLabel("Ano").fill("1994");

    await page.locator('input[type="file"]').first().setInputFiles({
      name: "e2e-project.png",
      mimeType: "image/png",
      buffer: pngPixel,
    });
    await expect(page.getByText("Principal").first()).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: /Criar projeto agora|Criar pagina do projeto|Criar página do projeto/i }).click();
    await page.waitForURL(/\/projeto\/[^/]+$/, { timeout: 30_000 });
    projectSlug = new URL(page.url()).pathname.split("/").filter(Boolean).at(-1) ?? "";
    expect(projectSlug).toBeTruthy();
    await expect(page.getByRole("heading", { name: new RegExp(projectTitle, "i") })).toBeVisible();

    const ownerLink = page.locator('a[href^="/perfil/"]').first();
    await expect(ownerLink).toBeVisible();
    ownerProfileHref = (await ownerLink.getAttribute("href")) ?? "";
    expect(ownerProfileHref).toMatch(/^\/perfil\//);

    await page.locator('a[href$="/editar"]').first().click();
    await expect(page).toHaveURL(/\/editar$/);
    await page.locator('textarea[name="description"]').fill("Projeto criado pelo E2E QA para validar edicao real.");
    await page.getByLabel("Cidade").fill("Curitiba");
    await page.getByLabel("Estado").fill("PR");
    await page.getByRole("button", { name: /Salvar alteracoes|Salvar alterações/i }).click();
    await page.waitForURL(/\/projeto\/[^/]+$/, { timeout: 30_000 });
    await expect(page.getByText("Curitiba")).toBeVisible();

    await logout(page);
  });

  test("segundo usuario nao edita projeto alheio e valida interacoes sociais", async ({ page }) => {
    await login(page, `/projeto/${projectSlug}`, e2eSecondUser);
    await expect(page.getByRole("heading", { name: new RegExp(projectTitle, "i") })).toBeVisible();

    await page.goto(`/projeto/${projectSlug}/editar`);
    await expect(page.getByRole("heading", { name: /Acesso restrito/i })).toBeVisible();
    await page.getByRole("link", { name: /Voltar para o projeto/i }).click();

    const followProject = page.getByRole("button", { name: /Seguir \(/ }).first();
    await expect(followProject).toBeVisible();
    initialFollowCount = await socialCount(followProject);
    await followProject.click();
    await expect(
      page.getByRole("button", { name: new RegExp(`Seguindo \\(${initialFollowCount + 1}\\)`) }).first()
    ).toBeVisible();

    const like = page.getByRole("button", { name: /Curtir \(/ }).first();
    initialLikeCount = await socialCount(like);
    await like.click();
    await expect(
      page.getByRole("button", { name: new RegExp(`Curtir \\(${initialLikeCount + 1}\\)`) }).first()
    ).toBeVisible();

    const save = page.getByRole("button", { name: /Salvar \(/ }).first();
    initialSaveCount = await socialCount(save);
    await save.click();
    await expect(
      page.getByRole("button", { name: new RegExp(`Salvar \\(${initialSaveCount + 1}\\)`) }).first()
    ).toBeVisible();

    await page.getByPlaceholder(/Comente sobre/i).fill("Comentario E2E QA entre usuarios");
    await page.getByRole("button", { name: /^Comentar$/ }).click();
    await expect(page.getByText("Comentario E2E QA entre usuarios")).toBeVisible();

    await page.goto("/garagem?aba=salvos");
    await expect(page.getByRole("heading", { name: "Projetos salvos" })).toBeVisible();
    await expect(page.getByText(projectTitle).first()).toBeVisible();

    await page.goto(ownerProfileHref);
    const followUser = page.getByRole("button", { name: /^Seguir$/ }).first();
    await expect(followUser).toBeVisible();
    await followUser.click();
    await expect(page.getByRole("button", { name: /^Seguindo$/ }).first()).toBeVisible();

    await logout(page);
  });

  test("usuario principal le notificacoes, nao recebe auto-notificacao e gera update para seguidor", async ({ page }) => {
    await login(page, "/notificacoes", e2eUser);
    await expect(page.getByRole("heading", { name: /Notifica/i })).toBeVisible();
    await expect(page.getByText(projectTitle).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/curtiu|salvou|seguidor|coment/i).first()).toBeVisible();
    await expect(page.getByText(`${projectTitle} recebeu uma curtida`, { exact: true })).toHaveCount(1);
    await expect(page.getByText(`${projectTitle} foi salvo`, { exact: true })).toHaveCount(1);
    await expect(page.getByText(`${projectTitle} ganhou um seguidor`, { exact: true })).toHaveCount(1);
    await expect(page.getByText(`${projectTitle} recebeu um comentário`, { exact: true })).toHaveCount(1);

    const markReadButtons = page.getByRole("button", { name: /Marcar lida/i });
    const unreadBefore = await markReadButtons.count();
    if (unreadBefore) {
      await markReadButtons.first().click();
      await expect(markReadButtons).toHaveCount(unreadBefore - 1);
    }

    await page.goto(`/projeto/${projectSlug}`);
    await page.getByRole("button", { name: /Curtir \(/ }).first().click();
    await page.goto("/notificacoes");
    await expect(page.getByText(/voce curtiu|você curtiu/i)).toHaveCount(0);

    await page.goto(`/projeto/${projectSlug}/editar`);
    await page.getByRole("button", { name: /Adicionar atualiza/i }).click();
    await page.getByLabel(/Titulo|Título/i).last().fill(`Atualizacao E2E QA ${Date.now()}`);
    await page.getByLabel(/Descricao|Descrição/i).last().fill("Update criado para validar notificacao de seguidores.");
    await page.getByRole("button", { name: /Salvar alteracoes|Salvar alterações/i }).click();
    await page.waitForURL(/\/projeto\/[^/]+$/, { timeout: 30_000 });

    await page.goto("/garagem");
    await expect(page.getByRole("heading", { name: "Similaridade com inspiracao" })).toBeVisible();
    await page.evaluate(() => {
      for (const key of Object.keys(window.localStorage)) {
        if (key.startsWith("pg-inspiration-planner:v1:")) window.localStorage.removeItem(key);
      }
    });
    await page.reload();

    const currentProject = page.getByLabel("Meu projeto atual");
    const inspiration = page.getByLabel("Build inspiracao");
    await expect(currentProject).toHaveValue(projectSlug);
    await expect(inspiration).toHaveValue("");
    await expect(page.getByText("Nenhuma inspiracao selecionada").first()).toBeVisible();
    const inspirationLabels = await inspiration.locator("option").allTextContents();
    expect(inspirationLabels).not.toContain(projectTitle);
    const inspirationSlug = await inspiration.evaluate((select: HTMLSelectElement) =>
      Array.from(select.options).find((option) => option.value)?.value ?? ""
    );
    expect(inspirationSlug).toBeTruthy();
    await inspiration.selectOption(inspirationSlug);
    await expect(page.getByText(/Parecido com a referencia/i)).toBeVisible();
    await expect(page).toHaveURL(/\/garagem/);

    const plannerStorageKey = await page.evaluate(() =>
      Object.keys(window.localStorage).find((key) => key.startsWith("pg-inspiration-planner:v1:")) ?? ""
    );
    expect(plannerStorageKey).toBeTruthy();
    await page.evaluate((storageKey) => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ currentSlug: "projeto-invalido", referenceSlug: "inspiracao-invalida" })
      );
    }, plannerStorageKey);
    await page.reload();
    await expect(page.getByLabel("Meu projeto atual")).toHaveValue(projectSlug);
    await expect(page.getByLabel("Build inspiracao")).toHaveValue("");

    await logout(page);
  });

  test("segundo usuario le notificacao de update, remove interacoes e projeto continua publico", async ({ page }) => {
    await login(page, "/notificacoes", e2eSecondUser);
    await expect(page.getByRole("heading", { name: /Notifica/i })).toBeVisible();
    await expect(page.getByText(projectTitle).first()).toBeVisible({ timeout: 30_000 });
    const markRead = page.getByRole("button", { name: /Marcar lida/i }).first();
    if (await markRead.count()) {
      await markRead.click();
    }

    await page.goto(`/projeto/${projectSlug}`);
    await expect(page.getByRole("heading", { name: new RegExp(projectTitle, "i") })).toBeVisible();
    await page.getByRole("button", { name: new RegExp(`Seguindo \\(${initialFollowCount + 1}\\)`) }).first().click();
    await expect(page.getByRole("button", { name: new RegExp(`Seguir \\(${initialFollowCount}\\)`) }).first()).toBeVisible();
    await page.getByRole("button", { name: new RegExp(`Curtir \\(${initialLikeCount + 1}\\)`) }).first().click();
    await expect(page.getByRole("button", { name: new RegExp(`Curtir \\(${initialLikeCount}\\)`) }).first()).toBeVisible();
    await page.getByRole("button", { name: new RegExp(`Salvar \\(${initialSaveCount + 1}\\)`) }).first().click();
    await expect(page.getByRole("button", { name: new RegExp(`Salvar \\(${initialSaveCount}\\)`) }).first()).toBeVisible();

    await page.goto(ownerProfileHref);
    await page.getByRole("button", { name: /^Seguindo$/ }).first().click();
    await expect(page.getByRole("button", { name: /^Seguir$/ }).first()).toBeVisible();

    await logout(page);

    await page.goto(`/projeto/${projectSlug}`);
    await expect(page.getByRole("heading", { name: new RegExp(projectTitle, "i") })).toBeVisible();
  });

  test("usuario principal remove o projeto de QA criado pela suite", async ({ page }) => {
    await login(page, `/projeto/${projectSlug}/editar`, e2eUser);
    await expect(page).toHaveURL(/\/editar$/);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: /Excluir projeto/i }).click();
    await page.waitForURL(/\/garagem|\/explorar|\/projetos|\/$/, { timeout: 30_000 });
  });
});
