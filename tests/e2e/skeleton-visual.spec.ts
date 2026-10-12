import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, test } from "./fixtures";

const viewports = [
  { name: "360", width: 360, height: 900 },
  { name: "390", width: 390, height: 900 },
  { name: "768", width: 768, height: 1000 },
  { name: "1024", width: 1024, height: 1000 },
  { name: "1440", width: 1440, height: 1100 },
  { name: "1920", width: 1920, height: 1100 },
] as const;

const publicPairs = [
  ["explorar", "/explorar"],
  ["rankings", "/rankings"],
  ["comparar", "/comparar"],
  ["atualizacoes", "/atualizacoes"],
  ["garagem", "/garagem"],
  ["notificacoes", "/notificacoes"],
  ["criar-projeto", "/criar-projeto"],
  ["formulario-perfil", "/onboarding"],
] as const;

const artifactRoot = process.env.SKELETON_ARTIFACT_DIR;
if (artifactRoot) mkdirSync(artifactRoot, { recursive: true });

function screenshotPath(testInfo: { outputPath: (name: string) => string }, name: string) {
  return artifactRoot ? path.join(artifactRoot, name) : testInfo.outputPath(name);
}

test.describe("skeletons responsivos", () => {
  test.skip(process.env.SKELETON_VISUAL_TEST !== "1", "Auditoria visual sob demanda.");

  for (const viewport of viewports) {
    for (const [skeleton, route] of publicPairs) {
      test(`${skeleton} em ${viewport.name}px`, async ({ page }, testInfo) => {
        await page.setViewportSize(viewport);
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await expect(page.locator("main").first()).toBeVisible();
        await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
        await page.screenshot({ path: screenshotPath(testInfo, `${skeleton}-${viewport.name}-real.png`), fullPage: true });

        await page.goto(`/dev-skeletons/${skeleton}`, { waitUntil: "domcontentloaded" });
        await expect(page.locator('[aria-busy="true"]')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
        await page.screenshot({ path: screenshotPath(testInfo, `${skeleton}-${viewport.name}-skeleton.png`), fullPage: true });
      });
    }
  }
});
