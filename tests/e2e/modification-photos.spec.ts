import { expect, test } from "./fixtures";

const owner = "48db0602-a04d-47bf-8f8d-304d51210321";
const pending = `${owner}/pending-modifications/90b48504-6830-4691-b957-71730e2eaa38.webp`;
const preview = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";

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
  await expect(page.getByAltText("Prévia da foto do projeto")).toBeVisible();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect.poll(() => deletes).toEqual([pending]);

  await page.getByRole("button", { name: "Adicionar modificação" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Turbo Motor" }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "test.webp", mimeType: "image/webp", buffer: Buffer.from("mock") });
  await expect(page.getByAltText("Prévia da foto do projeto")).toBeVisible();
  await page.getByRole("button", { name: "Adicionar modificação" }).last().click();
  await expect(page.getByRole("status")).toContainText(/Supabase|Entre para continuar/);
  await expect.poll(() => deletes).toEqual([pending, pending]);
  await expect(page.getByAltText("Prévia da foto do projeto")).toHaveCount(0);
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
  const input = page.locator('input[type="file"]');
  await input.setInputFiles({ name: "first.webp", mimeType: "image/webp", buffer: Buffer.from("first") });
  await expect(page.getByAltText("Prévia da foto do projeto")).toBeVisible();
  await input.setInputFiles({ name: "second.webp", mimeType: "image/webp", buffer: Buffer.from("second") });
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
  await expect(page.getByAltText("Prévia da foto do projeto")).toHaveCount(0);
  expect(deletes).toEqual([]);
  // Chromium logs the intentionally rejected upload as a resource error.
  runtimeMonitor.issues = runtimeMonitor.issues.filter((issue) =>
    issue !== "console.error: Failed to load resource: the server responded with a status of 400 (Bad Request)"
  );
});
