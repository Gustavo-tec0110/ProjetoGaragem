import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function harness({ viewer = null, failedSource = null } = {}) {
  const state = { shareCost: true, visible: true, calls: [] };
  function query(source) {
    state.calls.push(source);
    return {
      select() { return this; }, eq() { return this; }, in() { return this; },
      order() { return this; }, limit() { return this; },
      then(resolve) {
        if (source === failedSource) return Promise.resolve(resolve({ data: null, error: { message: `${source} unavailable` } }));
        const data = source === "cars" ? (state.visible ? [{ id: "car-a" }] : [])
          : source === "list_public_car_build_updates" || source === "car_build_updates"
            ? [{ id: "event-a", happened_at: "2026-10-14", image_urls: [] }]
          : source === "list_public_car_expenses" || source === "car_expenses"
            ? (viewer || state.shareCost ? [{ id: "expense-a", amount: 42 }] : []) : [];
        return Promise.resolve(resolve({ data, error: null }));
      },
    };
  }
  const client = { from: query, rpc: query };
  const imports = {
    "next/cache": { unstable_cache: (fn) => {
      const cache = new Map();
      return (...args) => {
        const key = JSON.stringify(args);
        if (!cache.has(key)) cache.set(key, fn(...args));
        return cache.get(key);
      };
    } },
    "@/lib/car-catalog": { FALLBACK_CAR_CATALOG: [] },
    "@/lib/server-log": { serverLog: { error() {} } },
    "@/lib/performance": { logPerformance() {}, performanceTimer: () => ({ lap() {}, end() {} }) },
    "@/lib/projects/cache": { PROJECT_CATALOG_CACHE_TAG: "catalog", PUBLIC_PROFILE_CACHE_TAG: "profiles" },
    "./server": { getSupabasePublicClient: () => client, getSupabaseServerClient: async () => client },
    "./auth-server": { getSupabaseServerUser: async () => viewer ? { id: viewer } : null },
    "@/lib/images/project-image-url": { protectedImageUrl: (value) => value ?? null },
  };
  const exports = {};
  const source = readFileSync(new URL("../../src/lib/supabase/queries.ts", import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText, { exports, performance, require: (name) => {
    assert.ok(name in imports, `Unexpected dependency: ${name}`);
    return imports[name];
  } });
  return { state, query: () => exports.qCarDetailsFromCard({ id: "car-a", slug: "car-a", owner_id: "owner-a" }) };
}

test("a populated public projection returns events and explicitly shared expenses", async () => {
  const h = harness();
  const result = await h.query();
  assert.equal(result.error, null);
  assert.equal(result.data.updates.length, 1);
  assert.equal(result.data.expenses[0].amount, 42);
  assert.ok(!h.state.calls.includes("car_expenses"));
});

test("RPC and related-table failures are reported instead of empty successful projects", async () => {
  for (const failedSource of ["list_public_car_build_updates", "list_public_car_expenses", "car_photos", "car_parts", "car_comments"]) {
    const result = await harness({ failedSource }).query();
    assert.equal(result.data, null);
    assert.equal(result.error, `${failedSource} unavailable`);
  }
});

test("owner uses RLS tables and receives their query errors", async () => {
  const h = harness({ viewer: "owner-a", failedSource: "car_expenses" });
  const result = await h.query();
  assert.equal(result.data, null);
  assert.equal(result.error, "car_expenses unavailable");
  assert.ok(!h.state.calls.includes("list_public_car_expenses"));
});

test("revoking shared cost bypasses a warmed public-detail cache", async () => {
  const h = harness();
  assert.equal((await h.query()).data.expenses.length, 1);
  h.state.shareCost = false;
  assert.equal((await h.query()).data.expenses.length, 0);
  h.state.visible = false;
  assert.equal((await h.query()).data, null);
});

test("the project page propagates detail failures to its retry boundary", async () => {
  const imports = {
    react: { cache: (fn) => fn },
    "@/lib/projects/mappers": { mapCarCardToProject: (value) => value, mapCarDetailsToProject: (value) => value },
    "@/lib/projects/utils": new Proxy({}, { get: () => (value) => Array.isArray(value) ? value : [] }),
    "@/lib/seo": {},
    "@/lib/supabase/env": { isSupabaseConfigured: true },
    "@/lib/supabase/queries": {
      qCarCardBySlug: async () => ({ data: { id: "car-a" }, error: null }),
      qCarDetailsFromCard: async () => ({ data: null, error: "projection unavailable" }),
      qExploreCars: async () => ({ data: [], error: null }),
    },
  };
  const exports = {};
  const source = readFileSync(new URL("../../src/lib/projects/server.ts", import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText, { exports, require: (name) => {
    assert.ok(name in imports, `Unexpected dependency: ${name}`);
    return imports[name];
  } });
  await assert.rejects(exports.getProjectPageData("car-a"), /Não foi possível carregar os dados do projeto/);
});
