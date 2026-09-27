import { expect, test } from "./fixtures";

// The server and browser must produce identical date text across time zones.
for (const timezoneId of ["UTC", "Pacific/Honolulu", "Asia/Tokyo"]) {
  test.describe(`project hydration in ${timezoneId}`, () => {
    test.use({ timezoneId });

    test("hydrates persisted social state, counts one view and toggles likes/saves", async ({ page }) => {
      const slug = "gol-quadrado-1994-ap18";
      await page.addInitScript(({ slug }) => {
        if (!localStorage.getItem("pg-project-social:v1")) {
          localStorage.setItem("pg-project-social:v1", JSON.stringify({
            [slug]: { liked: true, saved: true, views: 4 },
          }));
        }
      }, { slug });
      await page.goto(`/projeto/${slug}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const social = () => page.evaluate((slug) => JSON.parse(localStorage.getItem("pg-project-social:v1") ?? "{}")[slug], slug);
      await expect.poll(async () => (await social()).views).toBe(5);
      await expect(page.locator("#visao-geral")).toContainText("12.845");
      await expect(page.locator("#visao-geral")).toContainText("743");
      const like = page.getByRole("button", { name: /Remover curtida|Curtido/ }).first();
      await expect(like).toBeVisible();
      await like.click();
      await expect.poll(async () => (await social()).liked).toBe(false);
      await expect(page.locator("#visao-geral")).toContainText("742");
      await page.getByRole("button", { name: /Remover dos salvos|Salvo/ }).first().click();
      await expect.poll(async () => (await social()).saved).toBe(false);
      await expect(page.locator("#visao-geral")).toContainText("318");
      await page.reload();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect.poll(async () => (await social()).views).toBe(5);
    });
  });
}
