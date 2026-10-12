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
