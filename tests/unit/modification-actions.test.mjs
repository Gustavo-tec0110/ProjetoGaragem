import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

import * as paths from "../../src/lib/modifications/photo-path.ts";
import * as imageUrls from "../../src/lib/images/project-image-url.ts";

const owner = "48db0602-a04d-47bf-8f8d-304d51210321";
const other = "90b48504-6830-4691-b957-71730e2eaa38";
const carId = "7eb5259f-8bc9-4ae5-a0c4-c21c6ef97455";
const catalogId = "518f586d-d039-428d-a5a5-1fa0aa5c7466";
const modificationId = "5c7f3f86-82df-4df2-80ba-3c58181229c6";
const pending = `${owner}/pending-modifications/16c00ae1-10cb-46e2-b3d1-63d9710fbd2c.webp`;
const replacement = `${owner}/pending-modifications/58fe74b5-c9b7-4ab7-8cf1-13ee87f89d70.webp`;
const final = paths.finalizedModificationPhotoPath(pending, owner);
const replacementFinal = paths.finalizedModificationPhotoPath(replacement, owner);
const draft = (photoPath) => ({ catalogId, status: "installed", paidAmount: 10, note: "Teste", photoPath });

function actionHarness(options = {}) {
  const state = {
    objects: new Set(options.objects ?? [pending]),
    row: options.row ?? null,
    moved: [],
    removed: [],
    writes: [],
    reads: [],
    serviceCalls: 0,
  };
  const service = {
    storage: {
      from: () => ({
        move: async (source, destination) => {
          state.moved.push([source, destination]);
          if (options.moveError || !state.objects.has(source)) return { error: { message: "move failed" } };
          state.objects.delete(source);
          state.objects.add(destination);
          return { error: null };
        },
        getPublicUrl: (path) => ({ data: { publicUrl: `https://isolated.invalid/${path}` } }),
      }),
    },
  };
  const authClient = {
    async rpc() {
      return { data: !options.leaseDenied, error: options.leaseError ? { message: "lease unavailable" } : null };
    },
    from(table) {
      let operation = "read";
      let payload;
      return {
        select() { return this; },
        eq() { return this; },
        insert(value) { operation = "insert"; payload = value; return this; },
        update(value) { operation = "update"; payload = value; return this; },
        delete() { operation = "delete"; return this; },
        async maybeSingle() {
          if (table === "cars") return { data: { id: carId, slug: "teste", owner_id: owner }, error: null };
          if (table === "modification_catalog") return { data: { id: catalogId }, error: null };
          if (operation === "read") {
            state.reads.push(state.row);
            return { data: state.row, error: null };
          }
          state.writes.push({ operation, payload });
          if (options.throwWrite) throw new Error("database unavailable");
          if (options.writeError) return { data: null, error: { message: "write failed" } };
          if (options.zeroRows) return { data: null, error: null };
          if (operation === "insert") state.row = { id: modificationId, project_photo_storage_path: payload.project_photo_storage_path };
          if (operation === "update") state.row = { ...state.row, project_photo_storage_path: payload.project_photo_storage_path };
          if (operation === "delete") state.row = null;
          return { data: { id: modificationId }, error: null };
        },
      };
    },
  };

  const imports = {
    "next/cache": { revalidatePath() {} },
    "@/lib/images/project-image-url": imageUrls,
    "@/lib/server-log": { serverLog: { warn() {} } },
    "@/lib/modifications/photo-path": paths,
    "@/lib/modifications/photo-storage": {
      async removeUnreferencedModificationPhoto(path, userId, isPending) {
        if (!paths.isOwnedModificationPhotoPath(path, userId, isPending) ||
          state.row?.project_photo_storage_path === path) return false;
        state.objects.delete(path);
        state.removed.push(path);
        return true;
      },
    },
    "@/lib/supabase/storage": { PROJECT_IMAGES_BUCKET: "project-images" },
    "@/lib/supabase/service-role": {
      getSupabaseServiceRoleClient() {
        state.serviceCalls += 1;
        return options.serviceUnavailableAfterMove && state.serviceCalls > 1 ? null : service;
      },
    },
    "@/lib/supabase/auth-server": {
      async requireSupabaseUser() {
        return options.unauthenticated
          ? { supabase: null, user: null, error: "Entre para continuar." }
          : { supabase: authClient, user: { id: owner }, error: null };
      },
    },
  };
  const source = readFileSync(new URL("../../src/app/projeto/[slug]/modificacoes/actions.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require(name) {
      if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
      return imports[name];
    },
  });
  return { actions: exports, state };
}

test("A1: authenticated create moves pending photo and stores only final path", async () => {
  const { actions, state } = actionHarness();
  assert.equal((await actions.createProjectModification(carId, draft(pending))).ok, true);
  assert.equal(state.row.project_photo_storage_path, final);
  assert.equal(state.objects.has(final), true);
  assert.equal(state.objects.has(pending), false);
  assert.deepEqual(state.removed, []);
});

test("claimed or unavailable lease prevents moving or saving the photo", async () => {
  for (const options of [{ leaseDenied: true }, { leaseError: true }]) {
    const { actions, state } = actionHarness(options);
    assert.equal((await actions.createProjectModification(carId, draft(pending))).ok, false);
    assert.equal(state.moved.length, 0);
    assert.equal(state.writes.length, 0);
    assert.equal(state.objects.has(pending), true);
  }
});

test("A1: failed move keeps database unchanged; failed insert compensates moved photo", async () => {
  const move = actionHarness({ moveError: true });
  assert.equal((await move.actions.createProjectModification(carId, draft(pending))).ok, false);
  assert.equal(move.state.row, null);
  assert.equal(move.state.objects.has(pending), true);

  for (const failure of [{ writeError: true }, { throwWrite: true }, { zeroRows: true }, { serviceUnavailableAfterMove: true }]) {
    const { actions, state } = actionHarness(failure);
    assert.equal((await actions.createProjectModification(carId, draft(pending))).ok, false);
    assert.equal(state.row, null);
    assert.equal(state.objects.has(final), false);
    assert.deepEqual(state.removed, [final]);
  }
});

test("A1: replacement failure preserves old photo; success removes it after saving", async () => {
  const row = { id: modificationId, project_photo_storage_path: final };
  const failed = actionHarness({ objects: [final, replacement], row: { ...row }, zeroRows: true });
  assert.equal((await failed.actions.updateProjectModification(carId, modificationId, draft(replacement))).ok, false);
  assert.equal(failed.state.row.project_photo_storage_path, final);
  assert.equal(failed.state.objects.has(final), true);
  assert.equal(failed.state.objects.has(replacementFinal), false);

  const saved = actionHarness({ objects: [final, replacement], row: { ...row } });
  assert.equal((await saved.actions.updateProjectModification(carId, modificationId, draft(replacement))).ok, true);
  assert.equal(saved.state.row.project_photo_storage_path, replacementFinal);
  assert.equal(saved.state.objects.has(final), false);
  assert.equal(saved.state.objects.has(replacementFinal), true);
});

test("A1: deletion removes photo only after row deletion; foreign path and anonymous writes are rejected", async () => {
  const failed = actionHarness({ objects: [final], row: { id: modificationId, project_photo_storage_path: final }, zeroRows: true });
  assert.equal((await failed.actions.deleteProjectModification(carId, modificationId)).ok, false);
  assert.equal(failed.state.objects.has(final), true);

  const deleted = actionHarness({ objects: [final], row: { id: modificationId, project_photo_storage_path: final } });
  assert.equal((await deleted.actions.deleteProjectModification(carId, modificationId)).ok, true);
  assert.equal(deleted.state.row, null);
  assert.equal(deleted.state.objects.has(final), false);

  const foreign = actionHarness();
  assert.equal((await foreign.actions.createProjectModification(carId, draft(`${other}/pending-modifications/${pending.split("/")[2]}`))).ok, false);
  assert.deepEqual(foreign.state.moved, []);
  const anonymous = actionHarness({ unauthenticated: true });
  assert.equal((await anonymous.actions.createProjectModification(carId, draft(pending))).ok, false);
  assert.deepEqual(anonymous.state.moved, []);
});
