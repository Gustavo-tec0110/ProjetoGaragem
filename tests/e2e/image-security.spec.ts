import { expect, test } from "@playwright/test";

const path = "11111111-1111-4111-8111-111111111111/2026-10-14/private.webp";

test("optimizer refuses protected media, old Storage URLs and encoded aliases", async ({ request }) => {
  for (const source of [
    `/api/media/project/${path}`,
    `https://isolated.supabase.co/storage/v1/object/public/project-images/${path}`,
    `/api%2fmedia%2fproject/${path}`,
    `/api/og/private-project`,
  ]) {
    const response = await request.get(`/_next/image?url=${encodeURIComponent(source)}&w=640&q=75`);
    expect([400, 404]).toContain(response.status());
    expect(response.headers()["content-type"] ?? "").not.toMatch(/^image\//);
  }
});

test("shipped public assets retain image optimization", async ({ request }) => {
  for (const source of [
    "/ref/hero-opala-ss.webp",
    "/partnerships/creators/colecao-parceria.webp",
    "/partnerships/creators/perfil-exemplo-avatar.webp",
  ]) {
    const response = await request.get(`/_next/image?url=${encodeURIComponent(source)}&w=640&q=75`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/^image\//);
  }
});

test("invalid direct media requests have no body and no shared cache", async ({ request }) => {
  const response = await request.get("/api/media/project/not-a-valid-path.webp");
  expect(response.status()).toBe(404);
  expect(await response.body()).toHaveLength(0);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["netlify-cdn-cache-control"]).toBe("no-store");
});
