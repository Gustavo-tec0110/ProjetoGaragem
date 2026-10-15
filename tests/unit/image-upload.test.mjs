/* global Response, Request, FormData, File, Blob, crypto, URL, URLSearchParams */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { Buffer } from "node:buffer";
import ts from "typescript";
import * as urls from "../../src/lib/images/project-image-url.ts";
import * as photoPaths from "../../src/lib/modifications/photo-path.ts";
import * as limits from "../../src/lib/security/limits.ts";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const owner = "11111111-1111-4111-8111-111111111111";
const compile = (file) => ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const normalized = {};
runInNewContext(compile("../../src/lib/uploads/image-validation.ts"), {
  exports: normalized, Buffer, require: (name) => name === "sharp" ? sharp : name === "server-only" ? {} : limits,
});
const storagePaths = {};
runInNewContext(compile("../../src/lib/supabase/storage.ts"), {
  exports: storagePaths, crypto, require: (name) => name.includes("photo-path") ? photoPaths : limits,
});
const resizing = {};
runInNewContext(compile("../../src/lib/images/resize.ts"), {
  exports: resizing, Buffer, Blob, require: (name) => name === "sharp" ? sharp : name === "server-only" ? {} : limits,
});

function harness(options = {}) {
  const objects = new Map();
  const events = [];
  const auth = { supabase: {
    rpc: async (name) => {
      events.push(name);
      if (name === "reserve_storage_upload") return { data: options.quotaDenied ? null : "reservation", error: null };
      return { data: !options.leaseDenied, error: options.leaseError ? new Error("lease unavailable") : null };
    },
  }, user: options.anonymous ? null : { id: owner } };
  const service = { rpc: async (name) => { events.push(name); return { error: null }; }, storage: { from: (bucket) => ({
    upload: async (path, bytes, uploadOptions) => {
      assert.equal(bucket, "project-images");
      assert.equal(uploadOptions.cacheControl, "0");
      assert.equal(uploadOptions.upsert, false);
      events.push("upload");
      if (options.uploadFailure) return { error: new Error("upload unavailable") };
      objects.set(path, bytes);
      return { error: null };
    },
    remove: async (paths) => { events.push("remove"); for (const path of paths) objects.delete(path); return { error: null }; },
    getPublicUrl: () => { throw new Error("Public URL must never be emitted"); },
  }) } };
  const imports = {
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "@/lib/security/action-rate-limit": { enforceActionRateLimit: async () => ({ ok: true }) },
    "@/lib/security/limits": limits,
    "@/lib/supabase/auth-server": { requireSupabaseUser: async () => auth },
    "@/lib/supabase/service-role": { getSupabaseServiceRoleClient: () => service },
    "@/lib/supabase/storage": storagePaths,
    "@/lib/uploads/image-validation": normalized,
    "@/lib/modifications/photo-path": photoPaths,
    "@/lib/modifications/photo-storage": { removeUnreferencedModificationPhoto: async () => false },
    "@/lib/server-log": { serverLog: { warn() {} } },
    "@/lib/images/project-image-url": urls,
    "@/lib/images/delivery": { MEDIA_NO_STORE_HEADERS: { "Cache-Control": "private, no-store", "Netlify-CDN-Cache-Control": "no-store" } },
  };
  const exports = {};
  runInNewContext(compile("../../src/app/api/uploads/image/route.ts"), {
    exports, File, require: (name) => { assert.ok(name in imports, name); return imports[name]; },
  });
  return { route: exports, objects, events };
}

async function uploadRequest(kind, bytes, extra = false) {
  const form = new FormData();
  form.set("kind", kind);
  form.set("file", new File([bytes], "source.png", { type: "image/png" }));
  if (extra) form.set("path", "another-user/private.webp");
  return new Request("http://isolated.local/api/uploads/image", { method: "POST", body: form });
}
const png = await sharp({ create: { width: 16, height: 12, channels: 3, background: "#ff2222" } }).png().toBuffer();

test("project, modification, avatar and cover uploads return only protected URLs and normalized WebP", async () => {
  for (const kind of ["project", "modification", "avatar", "cover"]) {
    const { route, objects, events } = harness();
    const response = await route.POST(await uploadRequest(kind, png));
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.url, urls.projectImageUrl(body.path));
    assert.equal(body.path.split("/")[0], owner);
    assert.equal(body.width, 16);
    assert.equal(body.height, 12);
    assert.match(response.headers.get("Cache-Control"), /no-store/);
    assert.equal((await sharp(objects.get(body.path)).metadata()).format, "webp");
    assert.ok(events.includes("release_storage_upload_reservation"));
    assert.equal(events.includes("touch_pending_modification_photo"), kind === "modification");
  }
});

test("lease failures compensate only the newly uploaded object; failed upload releases its reservation", async () => {
  for (const options of [{ leaseDenied: true }, { leaseError: true }, { uploadFailure: true }]) {
    const { route, objects, events } = harness(options);
    const response = await route.POST(await uploadRequest("modification", png));
    assert.ok([400, 503].includes(response.status));
    assert.equal(objects.size, 0);
    assert.ok(events.includes("release_storage_upload_reservation"));
    assert.equal(events.includes("remove"), !options.uploadFailure);
  }
});

test("anonymous, quota failure, injected paths and invalid file bytes never upload", async () => {
  for (const [options, bytes, extra, expected] of [
    [{ anonymous: true }, png, false, 401],
    [{ quotaDenied: true }, png, false, 429],
    [{}, png, true, 400],
    [{}, new Blob(["not an image"]), false, 400],
  ]) {
    const { route, objects, events } = harness(options);
    assert.equal((await route.POST(await uploadRequest("project", bytes, extra))).status, expected);
    assert.equal(objects.size, 0);
    assert.equal(events.includes("upload"), false);
  }
});

test("protected responsive thumbnails really resize with Sharp and reject unbounded variants", async () => {
  const original = await sharp({ create: { width: 1024, height: 768, channels: 3, background: "#222222" } }).png().toBuffer();
  const options = resizing.imageResizeOptions(new URLSearchParams("w=128&q=75"));
  const thumbnail = await resizing.resizeProjectImage(new Blob([original], { type: "image/png" }), options);
  const metadata = await sharp(Buffer.from(await thumbnail.arrayBuffer())).metadata();
  assert.equal(metadata.width, 128);
  assert.equal(metadata.height, 96);
  assert.equal(metadata.format, "webp");
  assert.ok(thumbnail.size < original.byteLength);
  assert.equal(resizing.imageResizeOptions(new URLSearchParams()), null);
  for (const search of ["w=99999", "w=640&q=1", "w=640&w=128", "w=128&token=secret", "q=75"]) {
    assert.throws(() => resizing.imageResizeOptions(new URLSearchParams(search)));
  }
});
