import { expect, test } from "./fixtures";

const partnershipPath = "/parcerias/criadores";
const partnershipTitle = "Faça parte de quem está construindo o futuro do Projeto Garagem.";

test("convite abre anonimamente sem navegação global, cadastro ou inscrições", async ({ page, context }) => {
  expect(await context.cookies()).toEqual([]);

  const response = await page.goto(partnershipPath);

  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(new RegExp(`${partnershipPath}$`));
  await expect(page.locator("main[data-creator-partnership]")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: partnershipTitle })).toBeVisible();
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.locator("form")).toHaveCount(0);
  await expect(page.locator('a[href="/login"], a[href="/cadastro"], a[href="/criar-projeto"]')).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Preferências de cookies" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Sua privacidade na garagem" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Quem faz parte dessa história" })).toHaveCount(0);

  const authCookies = (await context.cookies()).filter((cookie) => /^sb-.*-auth-token/.test(cookie.name));
  expect(authCookies).toEqual([]);
});

test("programa apresenta os benefícios, limites e convite com contato oficial", async ({ page }) => {
  await page.goto(partnershipPath);

  for (const heading of [
    "Cultura automotiva. Projetos que conectam pessoas.",
    "O que significa ser um criador parceiro?",
    "Benefícios da fase inicial",
    "Possibilidades para o futuro",
    "Vamos conectar sua marca à cultura automotiva.",
  ]) {
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }

  await expect(page.locator("main")).not.toContainText(/fundador|de onde veio|Gustaf/i);
  await expect(page.getByRole("img", { name: "Criador verificado pelo Projeto Garagem", exact: true })).toBeVisible();
  expect(await page.locator("main section").evaluateAll(sections => sections[1].id)).toBe("produtos");
  const introductionLink = page.getByRole("link", { name: /Conheça o programa/ });
  await expect(introductionLink).toHaveAttribute("href", "#programa");
  await introductionLink.click();
  await expect(page).toHaveURL(new RegExp(`${partnershipPath}#programa$`));
  await expect(page.locator("#programa").getByRole("heading", {
    name: "Cultura automotiva. Projetos que conectam pessoas.",
  })).toBeInViewport();

  const contactLink = page.getByRole("link", { name: "Conversar sobre a parceria", exact: true });
  await expect(contactLink).toHaveAttribute("href", /^mailto:parcerias@projetogaragem\.com\.br\?subject=.+/);
  const contact = new URL((await contactLink.getAttribute("href"))!);
  expect(contact.protocol).toBe("mailto:");
  expect(contact.pathname).toBe("parcerias@projetogaragem.com.br");
  expect(contact.searchParams.get("subject")?.trim()).toBeTruthy();
});

test("produtos da parceria apresentam os conceitos e imagens ampliadas sem fluxo de compra", async ({ page, request }) => {
  await page.goto(partnershipPath);

  const products = page.getByRole("region", { name: "Produtos e merch com a nossa identidade." });
  await expect(products).toHaveAttribute("id", "produtos");
  await expect(products).toHaveAttribute("aria-labelledby", "produtos-titulo");
  await expect(products.getByRole("heading", {
    level: 2,
    name: "Produtos e merch com a nossa identidade.",
    exact: true,
  })).toBeVisible();
  await expect(products).toContainText("Conceitos visuais");
  await expect(products).toContainText("Produção, disponibilidade e eventual envio dependerão da viabilidade e dos acordos de cada parceria.");
  await expect(products).not.toContainText(/\b(?:preços?|comprar|carrinho|checkout|shop)\b|R\$\s*\d/i);

  const images = products.getByRole("img");
  await expect(images).toHaveCount(5);
  for (const image of await images.all()) {
    await expect(image).toHaveAttribute("alt", /\S/);
    await image.scrollIntoViewIfNeeded();
    await expect.poll(async () => image.evaluate((element: HTMLImageElement) => (
      element.complete && element.naturalWidth > 0
    ))).toBe(true);

    const imageSource = new URL((await image.getAttribute("src"))!, page.url());
    expect(imageSource.pathname).toBe("/_next/image");
    expect(imageSource.searchParams.get("url")).toMatch(/^\/partnerships\/creators\/[^/]+\.webp$/);
  }

  const enlargementLinks = products.getByRole("link", { name: /^Ampliar imagem:/ });
  await expect(enlargementLinks).toHaveCount(4);
  const imageDestinations = new Set<string>();
  for (const link of await enlargementLinks.all()) {
    const href = (await link.getAttribute("href"))!;
    expect(href).toMatch(/^\/partnerships\/creators\/[^/]+\.webp$/);
    imageDestinations.add(href);
    await expect(link).toHaveAttribute("target", "_blank");
    expect((await link.getAttribute("rel"))?.split(/\s+/)).toEqual(
      expect.arrayContaining(["noopener", "noreferrer"])
    );

    const imageResponse = await request.get(href);
    expect(imageResponse.status()).toBe(200);
    expect(imageResponse.headers()["content-type"]).toMatch(/^image\/webp(?:;|$)/);
  }
  expect(imageDestinations.size).toBe(4);
});

test("dúvidas sobre produtos e parceria podem ser abertas com mouse e teclado", async ({ page }) => {
  await page.goto(partnershipPath);

  const faq = page.locator("#duvidas");
  const questions = [
    "Os produtos já estão disponíveis?",
    "Como serão combinados os conteúdos?",
    "Há pagamento ou patrocínio garantido?",
    "Como continuo a conversa?",
  ];
  await expect(faq.locator("details")).toHaveCount(questions.length);
  await expect(faq.locator("summary")).toHaveText(questions);

  for (const question of questions) {
    const summary = faq.locator("summary").filter({ hasText: question });
    const detail = summary.locator("..");
    const answer = detail.locator(":scope > :not(summary)").first();

    await expect(detail).not.toHaveAttribute("open");
    await summary.click();
    await expect(detail).toHaveAttribute("open", "");
    await expect(answer).toBeVisible();
    await expect(answer).toHaveText(/\S/);

    await summary.focus();
    await summary.press("Space");
    await expect(detail).not.toHaveAttribute("open");
    await expect(answer).not.toBeVisible();
    await summary.press("Enter");
    await expect(detail).toHaveAttribute("open", "");
    await expect(answer).toBeVisible();
  }
});

test("convite impede indexação e fica ausente do sitemap e dos links da home", async ({ page, request }) => {
  const response = await page.goto(partnershipPath);
  expect(response?.status()).toBe(200);

  const robotDirectives = response?.headers()["x-robots-tag"]?.toLowerCase().split(/\s*,\s*/);
  expect(robotDirectives).toEqual(expect.arrayContaining(["noindex", "nofollow", "noarchive"]));
  for (const name of ["robots", "googlebot"]) {
    const metadata = page.locator(`meta[name="${name}"]`);
    await expect(metadata).toHaveAttribute("content", /(?:^|,\s*)noindex(?:,|$)/);
    await expect(metadata).toHaveAttribute("content", /(?:^|,\s*)nofollow(?:,|$)/);
  }
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `https://projetogaragem.com.br${partnershipPath}`
  );

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).not.toContain(partnershipPath);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sua garagem. Seu projeto." })).toBeVisible();
  await expect(page.locator(`a[href*="${partnershipPath}"]`)).toHaveCount(0);
  await expect(page.locator(`nav a[href*="${partnershipPath}"], footer a[href*="${partnershipPath}"]`)).toHaveCount(0);
});

test("landing mantém legibilidade, área de toque e largura em mobile e desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chromium", "As quatro larguras são verificadas no projeto desktop; o mobile já cobre o fluxo público.");

  for (const width of [320, 390, 768, 1440]) {
    await test.step(`viewport de ${width}px`, async () => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(partnershipPath);
      await page.evaluate(() => document.fonts.ready);

      await expect(page.getByRole("heading", { level: 1, name: partnershipTitle })).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(dimensions.document, `overflow horizontal em ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 1);
      expect(dimensions.body, `overflow do body em ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 1);

      for (const name of [/Conheça o programa/, "Conversar sobre a parceria"]) {
        const link = page.getByRole("link", { name });
        await link.scrollIntoViewIfNeeded();
        await expect(link).toBeVisible();
        const bounds = await link.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.height, `altura de toque em ${width}px`).toBeGreaterThanOrEqual(44);
        expect(bounds!.width, `largura de toque em ${width}px`).toBeGreaterThanOrEqual(44);
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
      }
    });
  }
});

test("preferência por movimento reduzido desativa animações da landing", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(partnershipPath);
  const landing = page.locator("main[data-creator-partnership]");
  await expect(landing).toBeVisible();

  const motion = await landing.evaluate((main) => {
    const elements = [main, ...main.querySelectorAll("*")];
    const hasDuration = (value: string) => value.split(",").some((duration) => parseFloat(duration) > 0);
    return elements.flatMap((element) => {
      const styles = getComputedStyle(element);
      return styles.animationName !== "none" && hasDuration(styles.animationDuration)
        ? [{ tag: element.tagName, animation: styles.animationName, duration: styles.animationDuration }]
        : [];
    });
  });
  expect(motion).toEqual([]);
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
  await expect(page.getByRole("heading", { level: 1, name: partnershipTitle })).toBeVisible();
});

test("home recupera seu shell após voltar pelo link da marca da landing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sua garagem. Seu projeto." })).toBeVisible();
  await expect(page.locator("header")).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();
  await expect(page.getByRole("region", { name: "Preferências de cookies" })).toBeVisible();

  await page.goto(partnershipPath);
  await expect(page.locator("main[data-creator-partnership]")).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Preferências de cookies" })).toHaveCount(0);

  const brandLink = page.getByRole("link", { name: "Projeto Garagem — início", exact: true });
  await expect(brandLink).toHaveAttribute("href", "/");
  await brandLink.click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Sua garagem. Seu projeto." })).toBeVisible();
  await expect(page.locator("header")).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();
  await expect(page.getByRole("link", { name: "Explorar projetos", exact: true })).toHaveAttribute("href", "/explorar");
  await expect(page.getByRole("region", { name: "Preferências de cookies" })).toBeVisible();
  await expect(page.locator("main[data-creator-partnership]")).toHaveCount(0);
  await expect(page.locator(`a[href*="${partnershipPath}"]`)).toHaveCount(0);

  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${partnershipPath}$`));
  await expect(page.locator("main[data-creator-partnership]")).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Preferências de cookies" })).toHaveCount(0);

  await page.goForward();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Sua garagem. Seu projeto." })).toBeVisible();
  await expect(page.locator("header")).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();
});
