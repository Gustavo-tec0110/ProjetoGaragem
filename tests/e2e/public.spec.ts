import { expect, test } from "./fixtures";

test("home e explorar continuam disponíveis sem projetos publicados", async ({ page }) => {
  const home = await page.goto("/");
  expect(home?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Sua garagem. Seu projeto." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explorar projetos", exact: true })).toHaveAttribute("href", "/explorar");

  const explore = await page.goto("/explorar");
  expect(explore?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Explorar projetos" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ainda nao ha projetos para exibir." })).toBeVisible();
  await expect(page.getByRole("link", { name: /Adicionar meu primeiro projeto/ })).toHaveAttribute("href", "/criar-projeto");
});

test("footer acompanha skeletons, conteúdo carregado e histórico de rotas", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("projeto-garagem:cookie-consent", JSON.stringify({
      version: 1,
      necessary: true,
      analytics: false,
      marketing: false,
      decidedAt: new Date().toISOString(),
    }));
  });

  await page.goto("/dev-skeletons/explorar");
  await expect(page.locator('[aria-busy="true"]')).toBeVisible();
  await expect(page.locator("footer")).toBeHidden();

  await page.goto("/explorar");
  await expect(page.getByRole("heading", { name: "Explorar projetos" })).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();

  const busyControl = page.locator("main button").first();
  await busyControl.evaluate((button) => button.setAttribute("aria-busy", "true"));
  await expect(page.locator("footer")).toBeVisible();
  await busyControl.evaluate((button) => button.removeAttribute("aria-busy"));

  await page.goto("/rankings");
  await expect(page).toHaveURL(/\/rankings$/);
  await expect(page.locator("footer")).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/explorar$/);
  await expect(page.locator("footer")).toBeVisible();

  await page.goto("/login");
  await expect(page.locator("footer")).toHaveCount(0);
});

test("slugs removidos retornam o estado de projeto inexistente", async ({ page }) => {
  const response = await page.goto("/projeto/projeto-de-catalogo-removido");
  expect(response?.status()).toBeLessThan(500);
  await expect(page.getByRole("heading", { name: "Essa ficha nao esta mais na pista" })).toBeVisible();
});

test("busca vazia preserva o termo e oferece recuperação", async ({ page }) => {
  const query = "projeto-inexistente-e2e-9f4c2d";
  await page.goto(`/explorar?q=${query}`);
  await expect(page.getByRole("heading", { name: `Resultados para "${query}"` })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nenhum projeto encontrado para essa busca." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Limpar filtros" }).first()).toHaveAttribute("href", "/explorar");
});
