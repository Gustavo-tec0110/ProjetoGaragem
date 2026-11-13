import { expect, test } from "./fixtures";

const owner = "48db0602-a04d-47bf-8f8d-304d51210321";
const pending = `${owner}/pending-modifications/90b48504-6830-4691-b957-71730e2eaa38.webp`;
const preview = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'/%3E";

async function confirmCover(page: import("@playwright/test").Page) {
  await page.getByRole("dialog", { name: "Ajustar capa" }).getByRole("button", { name: "Salvar recorte" }).click();
  await expect(page.getByAltText("Capa", { exact: true })).toBeVisible();
}

test("cancelamento e falha de gravação limpam somente foto temporária", async ({ page }) => {
  const deletes: string[] = [];
  await page.route("**/api/uploads/image", async (route) => {
    if (route.request().method() === "PATCH") {
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
      return;
    }
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ path: pending, url: preview }) });
      return;
    }
    if (route.request().method() === "DELETE") {
      deletes.push(JSON.parse(route.request().postData() ?? "{}").path);
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"removed":true}' });
    }
  });

  await page.goto("/test-harness/modification-photos");
  await page.getByRole("button", { name: "Adicionar modificação" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Turbo Motor" }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "test.webp", mimeType: "image/webp", buffer: Buffer.from("mock") });
  await confirmCover(page);
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect.poll(() => deletes).toEqual([pending]);

  await page.getByRole("button", { name: "Adicionar modificação" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Turbo Motor" }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "test.webp", mimeType: "image/webp", buffer: Buffer.from("mock") });
  await confirmCover(page);
  await page.getByRole("button", { name: "Adicionar modificação" }).last().click();
  await expect(page.getByRole("status")).toContainText(/Supabase|Entre para continuar/);
  await expect.poll(() => deletes).toEqual([pending, pending]);
  await expect(page.getByAltText("Capa", { exact: true })).toHaveCount(0);
});

test("cancelar edição não exclui foto persistida", async ({ page }) => {
  const deletes: string[] = [];
  await page.route("**/api/uploads/image", async (route) => {
    if (route.request().method() === "DELETE") deletes.push(route.request().postData() ?? "");
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"removed":true}' });
  });
  await page.goto("/test-harness/modification-photos");
  await page.getByRole("button", { name: "Editar" }).click();
  await page.getByRole("button", { name: "Cancelar" }).click();
  expect(deletes).toEqual([]);
});

test("reabrir o recorte preserva o zoom alterado com o teclado", async ({ page }) => {
  await page.route("**/api/uploads/image", (route) => route.fulfill({
    status: route.request().method() === "POST" ? 201 : 200,
    json: { path: pending, url: preview },
  }));
  await page.goto("/test-harness/modification-photos");
  await page.getByRole("button", { name: "Adicionar modificação" }).click();
  await page.getByLabel("Adicionar fotos").setInputFiles({ name: "cover.webp", mimeType: "image/webp", buffer: Buffer.from("fixture") });
  const dialog = page.getByRole("dialog", { name: "Ajustar capa" });
  await expect(dialog.getByRole("button", { name: "Salvar recorte" })).toBeEnabled();
  await dialog.getByRole("slider", { name: "Zoom" }).press("End");
  await confirmCover(page);
  const reopen = page.getByRole("button", { name: "Ajustar recorte" });
  await reopen.click();
  await expect(dialog.getByRole("slider", { name: "Zoom" })).toHaveValue("4");
  await dialog.getByRole("slider", { name: "Zoom" }).press("Home");
  await dialog.getByRole("slider", { name: "Zoom" }).press("ArrowRight");
  await confirmCover(page);
  await reopen.click();
  await expect(dialog.getByRole("slider", { name: "Zoom" })).toHaveValue("1.01");
});

test("substituir foto descarta a anterior e cancelar descarta a nova", async ({ page }) => {
  const nextPending = `${owner}/pending-modifications/1fae4c91-4c7f-48b5-a738-9037eec21608.webp`;
  const deletes: string[] = [];
  let uploads = 0;
  await page.route("**/api/uploads/image", async (route) => {
    if (route.request().method() === "PATCH") {
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
      return;
    }
    if (route.request().method() === "POST") {
      const path = ++uploads === 1 ? pending : nextPending;
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ path, url: preview }) });
      return;
    }
    deletes.push(JSON.parse(route.request().postData() ?? "{}").path);
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"removed":true}' });
  });

  await page.goto("/test-harness/modification-photos");
  await page.getByRole("button", { name: "Adicionar modificação" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Turbo Motor" }).click();
  await page.getByLabel("Adicionar fotos").setInputFiles({ name: "first.webp", mimeType: "image/webp", buffer: Buffer.from("first") });
  await confirmCover(page);
  await page.getByLabel("Substituir").setInputFiles({ name: "second.webp", mimeType: "image/webp", buffer: Buffer.from("second") });
  await confirmCover(page);
  await expect.poll(() => deletes).toEqual([pending]);
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect.poll(() => deletes).toEqual([pending, nextPending]);
});

test("upload recusado não deixa prévia nem dispara exclusão", async ({ page, runtimeMonitor }) => {
  const deletes: string[] = [];
  await page.route("**/api/uploads/image", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 400, contentType: "application/json", body: '{"message":"Imagem inválida."}' });
      return;
    }
    deletes.push(route.request().postData() ?? "");
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"removed":true}' });
  });
  await page.goto("/test-harness/modification-photos");
  await page.getByRole("button", { name: "Adicionar modificação" }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "bad.webp", mimeType: "image/webp", buffer: Buffer.from("invalid") });
  await expect(page.getByRole("status")).toContainText("Imagem inválida.");
  await expect(page.getByAltText("Capa", { exact: true })).toHaveCount(0);
  expect(deletes).toEqual([]);
  // Chromium logs the intentionally rejected upload as a resource error.
  runtimeMonitor.issues = runtimeMonitor.issues.filter((issue) =>
    issue !== "console.error: Failed to load resource: the server responded with a status of 400 (Bad Request)"
  );
});
