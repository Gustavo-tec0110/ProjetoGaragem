import { test, expect } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("projeto-garagem:cookie-consent", JSON.stringify({ version:1, necessary:true, analytics:false, marketing:false, decidedAt:"2026-10-27T12:00:00Z" })));
});

for (const [name, width, height] of [["desktop",1440,900],["tablet",768,1024],["mobile",390,844],["compact",360,800]] as const) {
  test(`${name}: ficha destaca instaladas, vínculo com catálogo e navegação preservada`, async ({ page }) => {
    const requests: string[] = [];
    page.on("request", request => { if (request.url().includes("/offers")) requests.push(request.url()); });
    await page.setViewportSize({ width, height });
    await page.goto("/test-harness/project-overview?owner=1");
    await page.locator('[data-catalog-ready="true"]').waitFor({ state:"attached" });
    const installed=page.getByRole("region",{name:"Modificações atuais",exact:true});
    await expect(installed.getByRole("heading",{name:"Volante esportivo",exact:true})).toBeVisible();
    expect(requests).toHaveLength(0);
    const position=await installed.boundingBox();
    const specs=await page.getByRole("heading",{name:"Ficha do projeto",exact:true}).boundingBox();
    expect(position!.y).toBeLessThan(specs!.y);
    await expect(page.getByRole("link",{name:"Gerenciar modificações",exact:true})).toHaveAttribute("href","/projeto/revisao-local/modificacoes");
    await page.screenshot({path:`docs/garagem-afiliados-2026-10-27/${name}.png`,fullPage:true,style:"nextjs-portal{display:none!important}"});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const trigger=installed.getByRole("button",{name:"Ver detalhes de Volante esportivo",exact:true});
    await trigger.click();
    const dialog=page.getByRole("dialog",{name:"Volante esportivo",exact:true});
    await expect(dialog).toBeVisible();
    const image=dialog.getByRole("img",{name:"Volante esportivo",exact:true});
    await expect.poll(()=>image.evaluate(element=>(element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    expect(requests).toHaveLength(1);
    await expect(dialog.getByRole("heading",{name:"Onde comprar"})).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(page.getByRole("region",{name:"Planos futuros"}).getByText("Wishlist",{exact:true})).toBeVisible();
  });
}

test("visitante, estado vazio e falha do catálogo preservam a ficha", async ({ page }) => {
  await page.goto("/test-harness/project-overview?empty=1");
  await page.locator('[data-catalog-ready="true"]').waitFor({state:"attached"});
  await expect(page.getByRole("link",{name:"Gerenciar modificações",exact:true})).toHaveCount(0);
  await expect(page.getByRole("link",{name:"Ver todas as modificações",exact:true})).toBeVisible();
  await expect(page.getByText("Nenhuma modificação instalada cadastrada.",{exact:true})).toBeVisible();
  await page.goto("/test-harness/project-overview?empty=1&unavailable=1");
  await expect(page.getByRole("status").filter({hasText:"Não foi possível carregar as modificações"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Ficha do projeto",exact:true})).toBeVisible();
});
