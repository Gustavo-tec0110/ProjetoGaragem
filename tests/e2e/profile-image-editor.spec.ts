import sharp from "sharp";
import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import {
  getProfileImageLayout,
  PROFILE_CROP_OUTPUT_SIZES,
  zoomProfileImageAtPoint,
} from "../../src/lib/profile/image-crop";

test.describe.configure({ timeout: 90_000 });

async function testImage(name = "crop-grid.png") {
  const svg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
      <rect width="600" height="400" x="0" y="0" fill="#ef4444"/>
      <rect width="600" height="400" x="600" y="0" fill="#22c55e"/>
      <rect width="600" height="400" x="0" y="400" fill="#2563eb"/>
      <rect width="600" height="400" x="600" y="400" fill="#facc15"/>
      <rect width="120" height="800" x="540" fill="#ffffff"/>
      <rect width="1200" height="80" y="360" fill="#111827"/>
      <circle cx="600" cy="400" r="44" fill="#f97316"/>
    </svg>
  `);
  return { name, mimeType: "image/png", buffer: await sharp(svg).png().toBuffer() };
}

async function openEditor(page: Page, kind: "avatar" | "cover") {
  await page.goto("/test-harness/profile-image-editor");
  await page.getByRole("button", { name: kind === "avatar" ? "Avatar" : "Capa" }).click();
  await page.getByTestId("editor-file-input").setInputFiles(await testImage());
  const area = page.getByTestId(`profile-${kind}-crop-area`);
  await expect(area).toBeVisible();
  await expect(page.getByAltText("Prévia do recorte")).toBeVisible();
  return area;
}

async function appliedPixels(page: Page) {
  return page.getByTestId("applied-image").evaluate(async (image: HTMLImageElement) => {
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas unavailable");
    context.drawImage(image, 0, 0);
    const points = [
      [0, 0],
      [image.naturalWidth - 1, 0],
      [Math.floor(image.naturalWidth / 2), Math.floor(image.naturalHeight / 2)],
      [0, image.naturalHeight - 1],
      [image.naturalWidth - 1, image.naturalHeight - 1],
    ];
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      samples: points.map(([x, y]) => [...context.getImageData(x, y, 1, 1).data]),
    };
  });
}

test("geometria limita deslocamento, preserva proporção e ancora o zoom", () => {
  const image = { width: 1200, height: 800 };
  const crop = { width: 600, height: 200 };
  const constrained = getProfileImageLayout(image, crop, 1, { x: 10, y: -10 });
  expect(constrained.width / constrained.height).toBeCloseTo(1.5);
  expect(constrained.left).toBe(0);
  expect(constrained.top).toBe(-200);
  expect(constrained.top + constrained.height).toBe(crop.height);

  const anchored = zoomProfileImageAtPoint(image, crop, 1, { x: 0, y: 0 }, 2, { x: 75, y: 50 });
  const before = getProfileImageLayout(image, crop, 1, { x: 0, y: 0 });
  const after = getProfileImageLayout(image, crop, anchored.zoom, anchored.position);
  expect((75 - before.left) / before.width).toBeCloseTo((75 - after.left) / after.width, 8);
  expect((50 - before.top) / before.height).toBeCloseTo((50 - after.top) / after.height, 8);
});

test("avatar responde a slider, botões, roda, arraste, limites, reset e exporta pixels", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chromium", "Mouse, roda e teclado são exercitados no desktop; o mobile usa o teste de toque.");
  const area = await openEditor(page, "avatar");
  const preview = page.getByAltText("Prévia do recorte");
  const initialImageBox = await preview.boundingBox();
  expect(initialImageBox).not.toBeNull();
  await testInfo.attach("avatar-inicial", { body: await page.screenshot(), contentType: "image/png" });

  const slider = page.getByTestId("profile-avatar-zoom");
  await slider.fill("2");
  await expect(area).toHaveAttribute("data-zoom", "2.000");
  const zoomedImageBox = await preview.boundingBox();
  expect(zoomedImageBox!.width).toBeGreaterThan(initialImageBox!.width * 1.9);

  await page.getByRole("button", { name: "Aumentar zoom" }).click();
  await expect(area).toHaveAttribute("data-zoom", "2.200");
  await page.getByRole("button", { name: "Diminuir zoom" }).click();
  await expect(area).toHaveAttribute("data-zoom", "2.000");

  const box = await area.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 90, box!.y + box!.height / 2 - 70, { steps: 8 });
  await page.mouse.up();
  expect(Number(await area.getAttribute("data-position-x"))).toBeGreaterThan(0.1);
  expect(Number(await area.getAttribute("data-position-y"))).toBeLessThan(-0.08);

  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + 5000, box!.y + 5000, { steps: 3 });
  await page.mouse.up();
  const areaBox = await area.boundingBox();
  const boundedImage = await preview.boundingBox();
  expect(boundedImage!.x).toBeLessThanOrEqual(areaBox!.x + 1);
  expect(boundedImage!.y).toBeLessThanOrEqual(areaBox!.y + 1);
  expect(boundedImage!.x + boundedImage!.width).toBeGreaterThanOrEqual(areaBox!.x + areaBox!.width - 1);
  expect(boundedImage!.y + boundedImage!.height).toBeGreaterThanOrEqual(areaBox!.y + areaBox!.height - 1);

  await page.getByRole("button", { name: "Redefinir" }).click();
  await expect(area).toHaveAttribute("data-zoom", "1.000");
  await expect(area).toHaveAttribute("data-position-x", "0.0000");
  await area.hover({ position: { x: box!.width * 0.75, y: box!.height / 2 } });
  const wheelZoomBefore = Number(await area.getAttribute("data-zoom"));
  await page.mouse.wheel(0, -500);
  await expect.poll(async () => Number(await area.getAttribute("data-zoom"))).toBeGreaterThan(wheelZoomBefore + 0.05);

  await area.focus();
  const keyboardPositionBefore = Number(await area.getAttribute("data-position-x"));
  await page.keyboard.press("ArrowRight");
  expect(Number(await area.getAttribute("data-position-x"))).toBeGreaterThan(keyboardPositionBefore);
  await testInfo.attach("avatar-editado", { body: await page.screenshot(), contentType: "image/png" });

  await page.getByRole("button", { name: "Aplicar recorte" }).click();
  await expect(page.getByTestId("applied-image")).toBeVisible();
  const output = await appliedPixels(page);
  expect(output.width).toBe(PROFILE_CROP_OUTPUT_SIZES.avatar.width);
  expect(output.height).toBe(PROFILE_CROP_OUTPUT_SIZES.avatar.height);
  expect(output.samples.every((sample: number[]) => sample[3] === 255)).toBe(true);
});

test("capa mantém 3:1, descarta cancelamento e reinicia ao trocar arquivo", async ({ page }, testInfo) => {
  const area = await openEditor(page, "cover");
  const box = await area.boundingBox();
  expect(box!.width / box!.height).toBeCloseTo(3, 1);
  await page.getByTestId("profile-cover-zoom").fill("2.5");
  await area.hover();
  await page.mouse.down();
  await page.mouse.move(box!.x + 30, box!.y + 30, { steps: 5 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByTestId("applied-image")).toHaveCount(0);

  await page.getByTestId("editor-file-input").setInputFiles(await testImage("replacement.png"));
  const replacementArea = page.getByTestId("profile-cover-crop-area");
  await expect(replacementArea).toHaveAttribute("data-zoom", "1.000");
  await expect(replacementArea).toHaveAttribute("data-position-x", "0.0000");
  await page.getByTestId("profile-cover-zoom").fill("3");
  await testInfo.attach("capa-editada", { body: await page.screenshot(), contentType: "image/png" });
  await page.getByRole("button", { name: "Aplicar recorte" }).click();
  const output = await appliedPixels(page);
  expect(output.width).toBe(PROFILE_CROP_OUTPUT_SIZES.cover.width);
  expect(output.height).toBe(PROFILE_CROP_OUTPUT_SIZES.cover.height);
  expect(output.width / output.height).toBe(3);
  expect(output.samples.every((sample: number[]) => sample[3] === 255)).toBe(true);
});

test("pinça amplia sem rolar a página", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Gesto multitoque validado no projeto mobile.");
  const area = await openEditor(page, "avatar");
  const box = await area.boundingBox();
  const client = await page.context().newCDPSession(page);
  const center = { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: center.x - 35, y: center.y, id: 1 },
      { x: center.x + 35, y: center.y, id: 2 },
    ],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: center.x - 90, y: center.y - 10, id: 1 },
      { x: center.x + 90, y: center.y + 10, id: 2 },
    ],
  });
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  expect(Number(await area.getAttribute("data-zoom"))).toBeGreaterThan(2);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  await testInfo.attach("avatar-pinca-mobile", { body: await page.screenshot(), contentType: "image/png" });
});
