/* global fetch */
import assert from "node:assert/strict";
import { writeFileSync, readFileSync } from "node:fs";
import process from "node:process";
import { URL, URLSearchParams } from "node:url";

const origin = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3107");
if (!["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)) throw new Error("Release check is local-only");
const results = [];
for (const route of ["/test-harness/profile-image-editor", "/test-harness/modification-photos", "/dev-skeletons/explorar"]) {
  const response = await fetch(new URL(route, origin));
  assert.equal(response.status, 404, `Test route must be disabled: ${route}`);
  results.push({ route, status: response.status, testRouteDisabled: true });
}
for (const source of ["/api/media/project/11111111-1111-4111-8111-111111111111/profile/avatar.webp",
  "https://isolated.supabase.co/storage/v1/object/public/project-images/11111111-1111-4111-8111-111111111111/profile/avatar.webp"]) {
  const url = new URL("/_next/image", origin);
  url.search = new URLSearchParams({ url: source, w: "640", q: "75" }).toString();
  const response = await fetch(url);
  assert.ok([400, 404].includes(response.status));
  assert.doesNotMatch(response.headers.get("Content-Type") ?? "", /^image\//);
  results.push({ route: url.pathname, status: response.status, protectedSourceBlocked: true });
}
for (const method of ["GET", "HEAD"]) {
  const response = await fetch(new URL("/api/media/project/invalid.webp", origin), { method });
  assert.equal(response.status, 404);
  assert.equal((await response.arrayBuffer()).byteLength, 0);
  assert.match(response.headers.get("Cache-Control"), /no-store/);
  assert.equal(response.headers.get("Netlify-CDN-Cache-Control"), "no-store");
  results.push({ route: "/api/media/project/invalid.webp", method, status: response.status, bytes: 0, noStore: true });
}
const home = await fetch(origin);
assert.equal(home.status, 200);
assert.match(await home.text(), /https:\/\/projetogaragem\.com\.br/);
const icon = await fetch(new URL("/favicon.ico", origin));
assert.equal(icon.status, 200);
writeFileSync("docs/evidencias-integracao-final/release-check.json", `${JSON.stringify({
  mode: "local-production-no-supabase", buildId: readFileSync(".next/BUILD_ID", "utf8").trim(),
  result: "passed", results, canonicalAndFavicon: true, remoteValidation: false,
}, null, 2)}\n`);
