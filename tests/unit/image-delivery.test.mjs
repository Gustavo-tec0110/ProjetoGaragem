import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as urls from "../../src/lib/images/project-image-url.ts";

const source = readFileSync(new URL("../../src/lib/images/delivery.ts", import.meta.url), "utf8");
const exports = {};
runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, Response, require: () => urls });
const { deliverProjectImage } = exports;
const path = "11111111-1111-4111-8111-111111111111/2026-10-14/photo.webp";
const image = new Blob(["private bytes"], { type: "image/webp" });

test("legacy URLs convert only from the configured origin; encoded traversal is rejected", () => {
  const origin = "https://isolated.supabase.co";
  assert.equal(urls.projectImagePathFromUrl(`${origin}/storage/v1/object/public/project-images/${path}`, origin), path);
  assert.equal(urls.projectImagePathFromUrl(urls.projectImageUrl(path), origin), path);
  for (const value of [
    `${origin}.evil/storage/v1/object/public/project-images/${path}`,
    `${origin}/storage/v1/object/public/project-images/${path}?token=secret`,
    `${origin}/storage/v1/object/public/project-images/${path}#fragment`,
    `${urls.PROJECT_MEDIA_PREFIX}${path.replace("photo", "%2e%2e/photo")}`,
    `${urls.PROJECT_MEDIA_PREFIX}${path}?token=secret`,
  ]) assert.equal(urls.projectImagePathFromUrl(value, origin), null, value);
  for (const value of [path.replace("photo", "../photo"), path.replace("photo", ".photo"), path.replace("photo", "a%2fb"), `${path}/bad`]) {
    assert.equal(urls.isProjectImagePath(value), false);
  }
});

test("denied/invalid paths never reach privileged Storage; DB errors fail closed", async () => {
  let downloads = 0;
  for (const decision of [false, null]) {
    const response = await deliverProjectImage(path, { authorize: async () => decision, download: async () => { downloads++; return image; } });
    assert.equal(response.status, decision === null ? 503 : 404);
    assert.equal(await response.text(), "");
    assert.match(response.headers.get("Cache-Control"), /no-store/);
  }
  assert.equal((await deliverProjectImage("../bad", { authorize: async () => true, download: async () => { downloads++; return image; } })).status, 404);
  assert.equal(downloads, 0);
});

test("visibility/reference removal during download prevents serving already fetched bytes", async () => {
  for (const afterDownload of [false, null]) {
    let visible = true;
    const response = await deliverProjectImage(path, {
      authorize: async () => visible,
      download: async () => { visible = afterDownload; return image; },
    });
    assert.equal(response.status, afterDownload === null ? 503 : 404);
    assert.equal(await response.text(), "");
  }
});

test("private transition while generating a thumbnail also fails closed", async () => {
  let visible = true;
  const response = await deliverProjectImage(path, {
    authorize: async () => visible,
    download: async () => image,
    transform: async (blob) => { visible = false; return blob; },
  });
  assert.equal(response.status, 404);
  assert.equal(await response.text(), "");
});

test("public/owner delivery and HEAD never opt into CDN caching, redirects, signed URLs or ETags", async () => {
  for (const head of [false, true]) {
    const response = await deliverProjectImage(path, { authorize: async () => true, download: async () => image }, head);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), head ? "" : "private bytes");
    for (const header of ["Cache-Control", "CDN-Cache-Control", "Netlify-CDN-Cache-Control", "Surrogate-Control"]) {
      assert.match(response.headers.get(header), /no-store/);
    }
    assert.equal(response.headers.get("ETag"), null);
    assert.equal(response.headers.get("Location"), null);
    assert.equal(response.headers.get("Vary"), "Cookie, Authorization");
  }
});

test("Storage outages and unexpected MIME types return no image bytes", async () => {
  for (const download of [async () => { throw new Error("offline"); }, async () => null, async () => new Blob(["script"], { type: "text/html" })]) {
    const response = await deliverProjectImage(path, { authorize: async () => true, download });
    assert.ok([404, 503].includes(response.status));
    assert.equal(await response.text(), "");
  }
});
/* global Response, Blob, URL */
