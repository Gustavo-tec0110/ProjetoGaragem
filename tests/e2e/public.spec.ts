import { expect, test } from "./fixtures";

const DEMO_PROJECT_PATH = "/projeto/gol-quadrado-1994-ap18";

function isMobileProject(projectName: string) {
  return projectName.includes("mobile");
}

test("home carrega, expoe links importantes e navega em desktop e mobile", async ({ page }, testInfo) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  const mobile = isMobileProject(testInfo.project.name);
  await expect(
    page.getByRole("heading", {
      name: mobile
        ? "Sua garagem online."
        : "Crie a ficha completa do seu projeto e descubra garagens reais da comunidade.",
    })
  ).toBeVisible();

  await expect(page.getByRole("link", { name: "Adicionar meu projeto", exact: true })).toHaveAttribute(
    "href",
    "/criar-projeto"
  );
  if (!mobile) {
    await expect(page.getByRole("link", { name: "Explorar projetos", exact: true })).toHaveAttribute(
      "href",
      "/explorar"
    );
  }
  await expect(page.getByRole("link", { name: "Ver todos", exact: true })).toHaveAttribute(
    "href",
    "/explorar"
  );

  const mobileNavigation = page.getByRole("navigation", {
    name: "Navegação principal mobile",
  });
  const navigation = mobile ? mobileNavigation : page.locator("header nav");
  await expect(mobileNavigation).toBeVisible({ visible: mobile });
  await expect(navigation.getByRole("link", { name: "Explorar", exact: true })).toBeVisible();
  await navigation.getByRole("link", { name: "Explorar", exact: true }).click();
  await expect(page).toHaveURL(/\/explorar$/);
  await expect(page.getByRole("heading", { name: "Explorar projetos" })).toBeVisible();
});

test("navegacao publica abre um projeto e valida interacoes de visitante", async ({ page }) => {
  await page.goto("/explorar");
  await expect(page.getByRole("heading", { name: "Explorar projetos" })).toBeVisible();

  await page.goto(DEMO_PROJECT_PATH);
  await expect(page).toHaveURL(/\/projeto\/[^/]+/);
  await expect(page.getByRole("button", { name: /Curtir/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mostre este build para alguem" })).toBeVisible();
  await expect(
    page.locator("#compartilhar").getByRole("button", { name: "Compartilhar projeto" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Continue navegando" })).toBeVisible();
  await expect(
    page
      .getByRole("heading", {
        name: /Mais projetos da mesma marca|Projetos semelhantes|Outros projetos populares/,
      })
      .first()
  ).toBeVisible();

  const heroImage = page.getByTestId("project-hero-image").locator("img");
  await expect(heroImage).toBeVisible();
  await expect
    .poll(() => heroImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0))
    .toBe(true);

  const likeButton = page.getByRole("button", { name: /Curtir/i }).first();
  await likeButton.click();
  const loginDialog = page.getByRole("dialog");
  if (await loginDialog.isVisible()) {
    await expect(loginDialog).toContainText(/Entre/i);
    await loginDialog.getByRole("button", { name: "Fechar" }).click();
    await expect(loginDialog).toBeHidden();
  } else {
    await expect(page.getByRole("button", { name: /Remover curtida|Curtir/i }).first()).toBeVisible();
  }

  await expect(
    page.locator("main").getByText("Comentários", { exact: true }).filter({ visible: true }).first()
  ).toBeVisible();
});

test("detalhe de projeto respeita o viewport sem overflow ou sobreposicao", async ({ page }, testInfo) => {
  await page.goto(DEMO_PROJECT_PATH);
  await expect(page.getByRole("heading", { name: "Gol Quadrado 1994 AP 1.8", exact: true })).toBeVisible();
  await expect(page.getByTestId("project-hero-image")).toBeVisible();

  const mobile = isMobileProject(testInfo.project.name);
  await expect(page.getByTestId("mobile-project-actions")).toBeVisible({ visible: mobile });
  await expect(page.getByTestId("mobile-project-tabs")).toBeVisible({ visible: mobile });

  const layout = await page.evaluate(() => {
    const header = document.querySelector("header")!;
    const title = document.querySelector("main h1")!;
    const hero = document.querySelector('[data-testid="project-hero-image"]')!;
    const actions = document.querySelector('[data-testid="mobile-project-actions"]');
    const tabs = document.querySelector('[data-testid="mobile-project-tabs"]');
    return {
      hasHorizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      headerBottom: header.getBoundingClientRect().bottom,
      titleTop: title.getBoundingClientRect().top,
      heroBottom: hero.getBoundingClientRect().bottom,
      actionsTop: actions?.getBoundingClientRect().top ?? null,
      actionsHeight: actions?.getBoundingClientRect().height ?? null,
      tabColumns: tabs
        ? getComputedStyle(tabs).gridTemplateColumns.split(" ").filter(Boolean).length
        : null,
    };
  });

  expect(layout.hasHorizontalOverflow).toBe(false);
  expect(layout.titleTop).toBeGreaterThanOrEqual(layout.headerBottom - 1);
  if (mobile) {
    expect(layout.actionsTop).toBeGreaterThan(layout.heroBottom);
    expect(layout.actionsHeight).toBeLessThanOrEqual(80);
    expect(layout.tabColumns).toBe(3);
    await expect(page.getByTestId("mobile-technical-specs")).toBeVisible();
  } else {
    await expect(page.getByRole("navigation", { name: "Navegação completa do projeto" })).toBeVisible();
  }

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  if (mobile) {
    const bottomClearance = await page.evaluate(() => {
      const detail = document.querySelector('[data-testid="project-detail"]')!;
      const bottomNav = document.querySelector('nav[aria-label="Navegação principal mobile"]')!;
      return {
        detailBottom: detail.getBoundingClientRect().bottom,
        navTop: bottomNav.getBoundingClientRect().top,
      };
    });
    expect(bottomClearance.detailBottom).toBeLessThanOrEqual(bottomClearance.navTop + 1);
  }
});

test("busca inteligente abre sugestao e filtros permanecem na URL", async ({ page }, testInfo) => {
  await page.goto("/explorar");
  const mobile = isMobileProject(testInfo.project.name);
  if (mobile) {
    await page.getByLabel("Pesquisar catálogo no celular").fill("Gol");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page).toHaveURL(/q=Gol/);
  } else {
    await page.getByLabel("Buscar projetos").fill("Gol");
    const firstSuggestion = page.getByRole("option").first();
    await expect(firstSuggestion).toBeVisible();
    await firstSuggestion.click();
    await expect(page).toHaveURL(/\/projeto\//);
  }

  await page.goto("/explorar?q=turbo&sort=likes");
  await expect(
    page.getByLabel(mobile ? "Pesquisar catálogo no celular" : "Buscar projetos")
  ).toHaveValue("turbo");

  if (mobile) {
    await expect(page.getByLabel("Ordenação mobile")).toHaveValue("likes");
    await page.getByRole("button", { name: "Abrir filtros avançados" }).click();
    const dialog = page.getByRole("dialog", { name: "Filtros" });
    await dialog.getByLabel("Filtrar por marca").selectOption("Ford");
    await dialog.getByRole("button", { name: "Aplicar filtros" }).click();
  } else {
    const form = page.locator("form[data-project-search-form]");
    await expect(form.getByLabel("Ordenar projetos")).toHaveValue("likes");
    await form.getByLabel("Filtrar por marca").selectOption("Ford");
    await form.getByRole("button", { name: "Filtrar", exact: true }).click();
  }

  await expect(page).toHaveURL(/q=turbo/);
  await expect(page).toHaveURL(/brand=Ford/);
  await expect(page).toHaveURL(/sort=likes/);
  if (mobile) {
    await expect(page.getByRole("link", { name: "Remover filtro Marca: Ford" })).toBeVisible();
  } else {
    await expect(page.locator('form[data-project-search-form]:visible').getByLabel("Filtrar por marca")).toHaveValue("Ford");
  }
});

test("busca sem resultados informa estado vazio e mantem o termo", async ({ page }) => {
  const query = "e2e-projeto-inexistente-9f4c2d";
  await page.goto(`/explorar?q=${query}`);
  await expect(page.getByLabel("Buscar projetos")).toHaveValue(query);
  await expect(page.getByRole("heading", { name: `Resultados para \"${query}\"` })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nenhum projeto encontrado para essa busca." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Limpar filtros" }).first()).toHaveAttribute(
    "href",
    "/explorar"
  );
});

test("projeto inexistente exibe estado adequado sem erro de servidor", async ({ page }) => {
  const response = await page.goto("/projeto/projeto-inexistente-e2e-9f4c2d");
  expect(response?.status()).toBeLessThan(500);
  await expect(page.getByText("Projeto nao encontrado", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Essa ficha nao esta mais na pista" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Explorar projetos|Voltar para explorar/i })).toBeVisible();
});

test("perfil publico lista contadores e permite navegar para um projeto", async ({ page }) => {
  await page.goto("/");
  const liveProjectLink = page.locator('[data-testid="project-card"] a[href^="/projeto/"]').first();
  const projectHref = await liveProjectLink.getAttribute("href");
  expect(projectHref).toBeTruthy();
  await page.goto(projectHref!);
  await expect(page.getByRole("heading", { name: "Comentários", exact: true })).toBeVisible();

  const ownerLink = page.locator('a[href^="/perfil/"]').first();
  const ownerHref = await ownerLink.getAttribute("href");
  test.skip(!ownerHref, "O catalogo ativo nao possui perfil publico associado aos projetos retornados.");
  await page.goto(ownerHref!);

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  for (const label of ["Projetos", "Curtidas recebidas", "Comentarios recebidos", "Visualizacoes", "Seguidores", "Seguindo"]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Destaques da garagem" })).toBeVisible();
  const profileProject = page.locator('[data-testid="project-card"] a[href^="/projeto/"]:visible').first();
  await expect(profileProject).toBeVisible();
  await profileProject.click();
  await expect(page).toHaveURL(/\/projeto\//);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("rotas privadas orientam visitante e preservam o destino de login", async ({ page }) => {
  await page.goto("/criar-projeto");
  await expect(
    page.getByRole("heading", { name: /Entrar no Projeto Garagem|Entre para criar seu projeto|Crie o projeto/i })
  ).toBeVisible();

  await page.goto("/garagem");
  await expect(page).toHaveURL(/\/login\?next=%2Fgaragem/);
  await expect(page.getByRole("heading", { name: "Entrar no Projeto Garagem" })).toBeVisible();

  await page.goto("/notificacoes");
  await expect(page.getByRole("heading", { name: "Notificações", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Entre para ver notificações" })).toBeVisible();
  await expect(page.locator("main").getByRole("link", { name: "Entrar", exact: true })).toHaveAttribute(
    "href",
    "/login?next=/notificacoes"
  );
});

test("catalogo usa cards responsivos sem overflow", async ({ page }, testInfo) => {
  await page.goto("/");
  const grid = page.getByTestId("project-grid").first();
  await expect(grid).toBeVisible();
  await grid.scrollIntoViewIfNeeded();

  const mobile = isMobileProject(testInfo.project.name);
  const columns = await grid.evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean)
  );
  expect(columns).toHaveLength(mobile ? 2 : 3);

  const card = grid.getByTestId("project-card").first();
  await expect(card.locator(`[data-project-card-layout="${mobile ? "mobile" : "desktop"}"]`)).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  expect(hasHorizontalOverflow).toBe(false);

  if (mobile) {
    const visibleCards = await grid.getByTestId("project-card").evaluateAll((cards) =>
      cards.filter((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      }).length
    );
    expect(visibleCards).toBeGreaterThanOrEqual(2);
  }
});

test("exploracao responsiva expoe filtros sem quebrar resultados", async ({ page }, testInfo) => {
  await page.goto("/explorar");
  const mobile = isMobileProject(testInfo.project.name);

  if (mobile) {
    const filterButton = page.getByRole("button", { name: "Abrir filtros avançados" });
    await expect(filterButton).toBeVisible();
    await expect(page.getByLabel("Ordenação mobile")).toBeVisible();
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
  } else {
    await expect(page.locator("form[data-project-search-form]:visible")).toBeVisible();
    await expect(page.getByRole("button", { name: "Abrir filtros avançados" })).toBeHidden();
  }

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  expect(hasHorizontalOverflow).toBe(false);
});
