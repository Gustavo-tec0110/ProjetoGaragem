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

test("catalogo de projetos usa cards compactos no mobile sem overflow", async ({ page }) => {
  const viewports = [
    { width: 320, height: 720 },
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const grid = page.getByTestId("project-grid").first();
    await expect(grid).toBeVisible();

    if (viewport.width < 768) {
      const firstCardTop = await grid.getByTestId("project-card").first().evaluate((card) =>
        card.getBoundingClientRect().top
      );
      expect(firstCardTop).toBeLessThanOrEqual(viewport.height * 1.5);
    }

    await grid.scrollIntoViewIfNeeded();

    const columns = await grid.evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean)
    );
    expect(columns).toHaveLength(viewport.width >= 1280 ? 3 : 2);

    const card = grid.getByTestId("project-card").first();
    const expectedLayout = viewport.width < 768 ? "mobile" : "desktop";
    await expect(card.locator(`[data-project-card-layout="${expectedLayout}"]`)).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(hasHorizontalOverflow).toBe(false);

    if (viewport.width < 768) {
      const visibleCards = await grid.getByTestId("project-card").evaluateAll((cards) =>
        cards.filter((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.top < window.innerHeight && rect.bottom > 0;
        }).length
      );
      expect(visibleCards).toBeGreaterThanOrEqual(2);
    }
  }
});

test("exploracao mobile prioriza resultados e abre filtros avancados sob demanda", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/explorar");

  const filterButton = page.getByRole("button", { name: "Abrir filtros avançados" });
  await expect(filterButton).toBeVisible();
  await expect(page.getByLabel("Ordenação mobile")).toBeVisible();

  const firstVisibleCardTop = await page.getByTestId("project-card").evaluateAll((cards) =>
    Math.min(...cards.map((card) => card.getBoundingClientRect().top))
  );
  expect(firstVisibleCardTop).toBeLessThanOrEqual(844 * 1.5);

  await filterButton.click();
  const dialog = page.getByRole("dialog", { name: "Filtros" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Filtrar por marca")).toBeVisible();
  await expect(dialog.getByLabel("Filtrar por modelo")).toBeVisible();
  await expect(dialog.getByLabel("Filtrar por ano")).toBeVisible();
  await expect(dialog.getByLabel("Filtrar por categoria")).toBeVisible();
  await expect(dialog.getByLabel("Filtrar por motor")).toBeVisible();
  await expect(dialog.getByLabel("Filtrar por combustível")).toBeVisible();
  await expect(dialog.getByLabel("Filtrar por aspirado ou turbo")).toBeVisible();
  await expect(dialog.getByLabel("Filtrar por tração")).toBeVisible();

  await dialog.getByLabel("Filtrar por marca").selectOption("Ford");
  await dialog.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page).toHaveURL(/brand=Ford/);
  await expect(page.getByRole("link", { name: "Remover filtro Marca: Ford" })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  expect(hasHorizontalOverflow).toBe(false);
});
