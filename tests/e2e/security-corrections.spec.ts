import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
  });
});

test("login remains interactive with baseline CSP and secure headers", async ({ page }) => {
  const response = await page.goto("/login");
  expect(response?.headers()["content-security-policy"]).toContain("object-src 'none'");
  // This release fixture deliberately has no Auth provider configured.
  await expect(page.getByText(/A entrada com Google está temporariamente indisponível/)).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill("fixture@fixture.invalid");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-only");
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("fixture@fixture.invalid");
  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeEnabled();
});

test("mutation handlers refuse foreign Origins before parsing or authentication", async ({ request }) => {
  for (const [url, method] of [
    ["/api/projetos/criar", "POST"],
    ["/api/projects/33333333-3333-4333-8333-333333333333/update", "POST"],
    ["/api/uploads/image", "POST"],
    ["/api/uploads/image", "PATCH"],
    ["/api/uploads/image", "DELETE"],
  ]) {
    const response = await request.fetch(url, { method, headers: { Origin: "https://fixture.invalid" }, data: "{}" });
    expect(response.status()).toBe(403);
  }
});

test("actual chunked bodies are limited without trusting Content-Length", async ({ baseURL }) => {
  // Node HTTP uses chunked transfer when Content-Length is absent.
  const http = await import("node:http");
  const result = await new Promise<number>((resolve, reject) => {
    const req = http.request(`${baseURL}/api/projetos/criar`, { method: "POST", headers: { "Content-Type": "application/json" } }, res => { res.resume(); resolve(res.statusCode ?? 0); });
    req.on("error", reject);
    for (let n = 0; n < 9; n++) req.write(Buffer.alloc(64 * 1024, 65));
    req.end();
  });
  expect(result).toBe(413);
});
