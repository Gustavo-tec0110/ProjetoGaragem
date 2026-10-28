import { test, expect } from "./fixtures";
import definitions from "../../src/lib/modifications/catalog-definitions.json";

test.skip(Boolean(process.env.CI) && !process.env.PLAYWRIGHT_BASE_URL, "A demonstração exige servidor local de desenvolvimento; produção é verificada separadamente.");

const output = process.env.CATALOG_DETAILS_SCREENSHOT_DIR ?? "docs/catalog-details-2026-10-27";
const screenshotStyle = "nextjs-portal { display: none !important; }";
test.beforeEach(async ({ page }, testInfo) => {
  page.on("pageerror", (error) => { void testInfo.attach("pageerror-stack", { body: error.stack ?? error.message, contentType: "text/plain" }); });
  await page.addInitScript(() => localStorage.setItem("projeto-garagem:cookie-consent", JSON.stringify({
    version: 1, necessary: true, analytics: false, marketing: false, decidedAt: "2026-10-27T12:00:00Z",
  })));
});

for (const [format, width, height] of [["desktop",1440,900],["tablet",768,1024],["mobile",390,844]] as const) {
  test(`${format}: detalhes, ofertas, teclado, foco e fechamento`, async ({ page, context }) => {
    await page.setViewportSize({ width, height });
    const offerRequests: string[] = [];
    page.on("request", (request) => { if (request.url().includes("/offers")) offerRequests.push(request.url()); });
    await page.goto("/test-harness/catalog-details");
    await page.locator('[data-catalog-ready="true"]').waitFor({ state: "attached" });
    expect(offerRequests).toHaveLength(0);
    const trigger = page.getByRole("button", { name: "Ver detalhes de Aerofólio", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Aerofólio", exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(definitions.find((row) => row.slug === "aerofolio")!.description, { exact: true })).toBeVisible();
    const image = dialog.getByRole("img", { name: "Aerofólio", exact: true });
    await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(image).toHaveAttribute("src", /modifications/);
    await expect(dialog.getByRole("button", { name: /Ver na loja/ })).toHaveCount(3);
    expect(offerRequests).toHaveLength(1);
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(height + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ style: screenshotStyle, path: `${output}/${format}.png` });
    for (const store of ["Mercado Livre", "Shopee", "Amazon"]) {
      await dialog.getByRole("button", { name: `Ver na loja ${store} — demonstração` }).click();
      await expect(dialog.getByRole("status")).toContainText(`Demonstração: ${store}`);
      expect(context.pages()).toHaveLength(1);
      expect(page.url()).toContain("/test-harness/catalog-details");
    }
    await expect(dialog.locator('a[href^="http"]')).toHaveCount(0);
    await dialog.getByRole("button", { name: /Ver na loja Amazon/ }).scrollIntoViewIfNeeded();
    await page.screenshot({ style: screenshotStyle, path: `${output}/${format}-offers.png` });
    // Focus stays trapped in the modal, including when cycling past the final action.
    for (let step = 0; step < 8; step++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.press("Enter");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Fechar detalhes" }).click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.getByTestId("catalog-details-overlay").click({ position: { x: 3, y: 3 } });
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    for (const [name, count] of [["Coilover",1],["Radiador de arrefecimento",0],["Turbocompressor",3],["Volante esportivo",3]] as const) {
      await page.getByRole("button", { name: `Ver detalhes de ${name}`, exact: true }).click();
      const details = page.getByRole("dialog", { name, exact: true });
      if (count) await expect(details.getByRole("button", { name: /Ver na loja/ })).toHaveCount(count);
      else await expect(details.getByText("Opções de compra ainda não disponíveis para este componente.")).toBeVisible();
      await page.screenshot({ style: screenshotStyle, path: `${output}/${format}-${count}-offers.png` });
      await page.keyboard.press("Escape");
    }
  });
}

test("detalhes dentro do editor preservam seleção, filtros e formulário", async ({ page }) => {
  await page.goto("/test-harness/catalog");
    await page.locator('[data-catalog-ready="true"]').waitFor({ state: "attached" });
  await page.getByRole("button", { name: "Adicionar modificação", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Adicionar modificação", exact: true });
  await editor.getByRole("searchbox").fill("aerofolio");
  const selection = editor.getByRole("button", { name: "Aerofólio Exterior", exact: true });
  await selection.click();
  await expect(selection).toHaveAttribute("aria-pressed", "true");
  const trigger = editor.getByRole("button", { name: "Ver detalhes de Aerofólio", exact: true });
  await trigger.click();
  const details = page.getByRole("dialog", { name: "Aerofólio", exact: true });
  await expect(details.getByRole("button", { name: /Ver na loja/ })).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(details).toBeHidden();
  await expect(editor).toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(selection).toHaveAttribute("aria-pressed", "true");
  await expect(editor.getByRole("searchbox")).toHaveValue("aerofolio");
  await expect(editor.getByRole("button", { name: "Adicionar modificação", exact: true })).toBeEnabled();
  await editor.getByRole("button", { name: "Cancelar", exact: true }).click();
});

test("API valida entradas e demonstração não expõe destinos", async ({ request }) => {
  expect((await request.get("/api/catalog/invalid/offers")).status()).toBe(400);
  const response = await request.get("/api/catalog/74f41706-15c6-470c-9c55-0b426e72e209/offers?demonstration=1");
  expect(response.headers()["cache-control"]).toBe("no-store");
  const result = await response.json();
  expect(result.demonstration).toBe(true);
  expect(result.offers).toHaveLength(3);
  for (const offer of result.offers) { expect(offer.destination_url).toBeNull(); expect(offer.price).toBeNull(); expect(offer.is_affiliate).toBe(false); }
  expect((await request.post("/api/catalog/74f41706-15c6-470c-9c55-0b426e72e209/offers?demonstration=1", { data: {} })).status()).toBe(405);
});

for (const [width, height] of [[1440,900],[768,1024],[390,844]]) {
  test(`textos extensos, proporções e imagem ausente em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/test-harness/catalog-details/stress");
    await page.locator('[data-catalog-ready="true"]').waitFor({ state: "attached" });
    for (const shape of ["horizontal", "vertical", "ausente"]) {
      await page.getByRole("button", { name: `Abrir fixture ${shape}` }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: /Fixture de layout: nome extenso/ })).toBeVisible();
      const close = dialog.getByRole("button", { name: "Fechar detalhes" });
      await expect(close).toBeVisible();
      expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (shape !== "ausente") {
        const img = dialog.getByRole("img");
        await expect.poll(() => img.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
        const ratio = await img.evaluate((element) => { const image = element as HTMLImageElement; return image.naturalWidth / image.naturalHeight; });
        if (shape === "horizontal") expect(ratio).toBeGreaterThan(1.5);
        else expect(ratio).toBeLessThan(1);
        await expect(img).toHaveCSS("object-fit", "contain");
      }
      await dialog.getByText("Opções de compra ainda não disponíveis para este componente.").scrollIntoViewIfNeeded();
      await expect(close).toBeInViewport();
      await page.screenshot({ style: screenshotStyle, path: `${output}/stress-${width}-${shape}.png` });
      await close.click();
    }
  });
}

test("ofertas indisponíveis permitem nova consulta", async ({ page }) => {
  let reads = 0;
  await page.route(/\/api\/catalog\/[^/]+\/offers(?:\?|$)/, (route) => {
    reads++;
    return route.fulfill({ json: reads === 1 ? { offers: [], demonstration: false, unavailable: true } : { offers: [], demonstration: false } });
  });
  await page.goto("/test-harness/catalog-details");
    await page.locator('[data-catalog-ready="true"]').waitFor({ state: "attached" });
  await page.getByRole("button", { name: "Ver detalhes de Aerofólio", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Não foi possível consultar as opções de compra agora.")).toBeVisible();
  await dialog.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(dialog.getByText("Opções de compra ainda não disponíveis para este componente.")).toBeVisible();
  expect(reads).toBe(2);
});

test("links reais recebem proteção e identificação; preços vencidos e destinos inválidos são omitidos", async ({ page }) => {
  await page.route(/\/api\/catalog\/[^/]+\/offers(?:\?|$)/, (route) => route.fulfill({ json: { demonstration: false, offers: [
    { id: "safe", store: "amazon", destination_url: "https://amazon.com.br/test-fixture", is_affiliate: true, price: 120, price_checked_at: new Date(Date.now() - 1000).toISOString(), demonstration: false },
    { id: "stale", store: "shopee", destination_url: "https://shopee.com.br/test-fixture", is_affiliate: false, price: 98765, price_checked_at: "2020-01-01T12:00:00Z", demonstration: false },
    { id: "unsafe", store: "mercado_livre", destination_url: "javascript:alert(1)", is_affiliate: true, price: null, price_checked_at: null, demonstration: false },
  ] } }));
  await page.goto("/test-harness/catalog-details");
    await page.locator('[data-catalog-ready="true"]').waitFor({ state: "attached" });
  await page.getByRole("button", { name: "Ver detalhes de Aerofólio", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const link = dialog.getByRole("link", { name: /Ver na loja Amazon/ });
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer sponsored");
  await expect(dialog.getByText("Link de afiliado", { exact: true })).toBeVisible();
  await expect(dialog.getByText(/120,00/)).toBeVisible();
  await expect(dialog.getByText(/98.765/)).toHaveCount(0);
  await expect(dialog.getByText("Mercado Livre", { exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("link", { name: /Ver na loja/ })).toHaveCount(2);
  // Attribute inspection only: fixture links are never followed.
});

test("busca, categorias, paginação e edição legada continuam funcionando", async ({ page }) => {
  await page.goto("/test-harness/catalog");
    await page.locator('[data-catalog-ready="true"]').waitFor({ state: "attached" });
  await page.getByRole("button", { name: "Adicionar modificação", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Adicionar modificação", exact: true });
  const list = editor.getByLabel("Peças do catálogo");
  await expect(list.locator("button[aria-pressed]")).toHaveCount(40);
  await editor.getByRole("button", { name: /Mostrar mais peças/ }).click();
  await expect(list.locator("button[aria-pressed]")).toHaveCount(80);
  const search = editor.getByRole("searchbox");
  await search.fill("turbina");
  await expect(editor.getByRole("button", { name: "Turbocompressor Motor / Performance", exact: true })).toBeVisible();
  await editor.getByRole("navigation", { name: "Categorias de peças" }).getByRole("button", { name: "Freios", exact: true }).click();
  await expect(editor.getByText("Nenhuma peça encontrada. Tente outro termo ou categoria.")).toBeVisible();
  await editor.getByRole("button", { name: "Limpar filtros" }).click();
  await search.fill("suspensao a ar");
  const part = editor.getByRole("button", { name: "Suspensão a ar Suspensão", exact: true });
  await part.click();
  await expect(part).toHaveAttribute("aria-pressed", "true");
  await expect(editor.getByRole("button", { name: "Adicionar modificação", exact: true })).toBeEnabled();
  await editor.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  const editing = page.getByRole("dialog", { name: "Editar modificação", exact: true });
  await editing.getByRole("searchbox").fill("rosca");
  await expect(editing.getByRole("button", { name: "Suspensão a rosca Suspensão", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(editing.getByRole("button", { name: "Salvar alterações" })).toBeEnabled();
  await editing.getByRole("button", { name: "Cancelar", exact: true }).click();
});
