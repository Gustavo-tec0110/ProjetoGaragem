import assert from "node:assert/strict";
import test from "node:test";
import { URL } from "node:url";

import { getSafeNextPath } from "../../src/lib/auth/redirect.ts";
import {
  finalizedModificationPhotoPath,
  isOwnedModificationPhotoPath,
  newPendingModificationPhotoPath,
  removePhotoIfUnreferenced,
} from "../../src/lib/modifications/photo-path.ts";

const owner = "48db0602-a04d-47bf-8f8d-304d51210321";
const other = "90b48504-6830-4691-b957-71730e2eaa38";
const pending = newPendingModificationPhotoPath(owner);
const final = finalizedModificationPhotoPath(pending, owner);

test("A1: generated upload path belongs to owner and finalizes to DB-compatible path", () => {
  assert.equal(isOwnedModificationPhotoPath(pending, owner, true), true);
  assert.equal(isOwnedModificationPhotoPath(final, owner, false), true);
  assert.equal(final?.startsWith(`${owner}/modifications/`), true);
  assert.equal(isOwnedModificationPhotoPath(pending, other, true), false);
  assert.equal(isOwnedModificationPhotoPath(final, other, false), false);
});

test("A1: malformed paths, formats, folders and traversal are rejected", () => {
  for (const path of [
    `${owner}/pending-modifications/123.webp`,
    pending.replace(".webp", ".png"),
    pending.replace(".webp", ".WEBP"),
    pending.replace("pending-modifications", "profile"),
    pending.replace(".webp", "\\.webp"),
    `${owner}/pending-modifications/../${pending.split("/")[2]}`,
    `/${pending}`,
    `https://example.com/${pending}`,
  ]) {
    assert.equal(isOwnedModificationPhotoPath(path, owner, true), false, path);
    assert.equal(finalizedModificationPhotoPath(path, owner), null, path);
  }
});

test("A2: only internal redirects resolve to the permitted origin", () => {
  const origin = "https://projetogaragem.com.br";
  for (const path of ["/garagem", "/projeto/teste?aba=fotos#topo", "/criar-projeto"]) {
    const safe = getSafeNextPath(path);
    assert.equal(safe, path);
    assert.equal(new URL(safe, origin).origin, origin);
  }
  for (const path of [
    "https://evil.example/path", "//evil.example/path", "/\\evil.example/path",
    "/%5cevil.example/path", "/%2fevil.example/path", "/%2F%2Fevil.example",
    "/%0aevil.example", "\\evil.example", "garagem", "/\u0000evil",
    "/a/..//evil.example", "/%2e%2e//evil.example",
  ]) {
    assert.equal(getSafeNextPath(path), "/garagem", path);
    assert.equal(new URL(getSafeNextPath(path), origin).origin, origin);
  }
});

test("A3: cleanup never removes another user's or referenced photo and fails closed", async () => {
  const removed = [];
  const dependencies = (reference) => ({
    hasReference: async () => reference,
    remove: async (path) => { removed.push(path); return true; },
  });
  assert.equal(await removePhotoIfUnreferenced(pending, other, true, dependencies(false)), false);
  assert.equal(await removePhotoIfUnreferenced(final, owner, true, dependencies(false)), false);
  assert.equal(await removePhotoIfUnreferenced(final, owner, false, dependencies(true)), false);
  assert.equal(await removePhotoIfUnreferenced(final, owner, false, dependencies(null)), false);
  assert.equal(await removePhotoIfUnreferenced(final, owner, false, {
    hasReference: async () => { throw new Error("database unavailable"); },
    remove: async (path) => { removed.push(path); return true; },
  }), false);
  assert.deepEqual(removed, []);
  assert.equal(await removePhotoIfUnreferenced(pending, owner, true, dependencies(false)), true);
  assert.deepEqual(removed, [pending]);
  assert.equal(await removePhotoIfUnreferenced(pending, owner, true, {
    hasReference: async () => false,
    remove: async () => { throw new Error("storage unavailable"); },
  }), false);
});
