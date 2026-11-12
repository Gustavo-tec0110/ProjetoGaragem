import { expect, test } from "./fixtures";

test("Minha Garagem conserva projeto criado no modo local após recarga", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("projeto-garagem:cookie-consent", JSON.stringify({
    version: 1, necessary: true, analytics: false, marketing: false, decidedAt: "2026-11-04T12:00:00Z",
  })));
  await page.goto("/criar-projeto");
  await page.getByLabel("Nome do projeto", { exact: true }).fill("Auditoria local de garagem");
  await page.getByLabel("Carro", { exact: true }).fill("Volkswagen Gol");
  await page.getByLabel("Ano", { exact: true }).fill("1994");
  await page.getByLabel("Imagem principal", { exact: true }).fill("/ref/hero-opala-ss.webp");
  await page.getByRole("button", { name: "Criar projeto local", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Auditoria local de garagem", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Auditoria local de garagem", exact: true })).toBeVisible();
  await page.goto("/garagem");
  await expect(page.getByRole("heading", { name: "Auditoria local de garagem", exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("pg-local-projects:v1")!).length)).toBe(1);
});

test("HTML do servidor e navegação a partir do convite permanecem disponíveis", async ({ page, request }) => {
  const home = await request.get("/");
  const html = await home.text();
  expect(home.status()).toBe(200);
  expect(html).toContain("Sua garagem.");
  expect(html.replace(/<[^>]*>/g, "")).toContain("Seu projeto.");
  expect(html).toContain("<nav");
  expect(html).toContain("<footer");

  await page.goto("/parcerias/criadores");
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await page.getByRole("link", { name: "Projeto Garagem — início", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sua garagem. Seu projeto." })).toBeVisible();
  await expect(page.getByRole("navigation").first()).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();
  await page.goBack();
  await expect(page.locator("main[data-creator-partnership]")).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
});

test("login remains clickable before the optional cookie choice", async ({ page }) => {
  await page.goto("/login");
  const banner = page.getByRole("region", { name: "Preferências de cookies" });
  await expect(banner).toBeVisible();
  const submit = page.getByRole("button", { name: "Entrar", exact: true });
  await submit.click();
  await expect(page).toHaveURL(/\/login$/);
  const boxes = await Promise.all([submit.boundingBox(), banner.boundingBox()]);
  expect(boxes[0]!.y + boxes[0]!.height).toBeLessThanOrEqual(boxes[1]!.y);
  await expect(banner).toBeVisible();
});

test("cookie choices persist, can be revoked, and the dialog supports Escape", async ({ page }) => {
  const analyticsRequests: string[] = [];
  page.on("request", (request) => {
    if (/google-analytics|googletagmanager|analytics\.google/.test(request.url())) analyticsRequests.push(request.url());
  });
  await page.goto("/");
  const banner = page.getByRole("region", { name: "Preferências de cookies" });
  await banner.getByRole("button", { name: "Configurar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Preferências de cookies" });
  await expect(dialog.getByRole("checkbox")).not.toBeChecked();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await banner.getByRole("button", { name: "Aceitar", exact: true }).click();
  await page.reload();
  await expect(banner).toBeHidden();
  await page.getByRole("button", { name: "Gerenciar cookies" }).click();
  await expect(dialog.getByRole("checkbox")).toBeChecked();
  await dialog.getByRole("checkbox").uncheck();
  await dialog.getByRole("button", { name: "Salvar preferência" }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("projeto-garagem:cookie-consent")!).analytics)).toBe(false);
  await page.reload();
  await expect(banner).toBeHidden();
  expect(analyticsRequests).toEqual([]);
});

test("legal pages and SEO metadata survive the integrated layout", async ({ page, request }) => {
  for (const path of ["/terms", "/privacy"]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://projetogaragem.com.br${path}`);
  }
  await page.goto("/login");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).not.toMatch(/dev-skeletons|test-harness|\/login</);
  const icon = await request.get("/favicon.ico");
  expect(icon.status()).toBe(200);
});
