/* global process, console, URL, fetch */
// Explicitly opt in. Only accounts created by this process are cleaned up.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());
const ref = "hxqhudfzdwfxnjzmphya";
if (!process.argv.includes(`--confirm-ref=${ref}`)) throw new Error("Confirme explicitamente o Project Ref.");
const url = `https://${ref}.supabase.co`;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente.");
let publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!publicKey) {
  const origin = "https://projetogaragem.com.br";
  const html = await (await fetch(origin)).text();
  for (const match of html.matchAll(/src="([^"]+\.js(?:\?[^"]*)?)"/g)) {
    const body = await (await fetch(new URL(match[1], origin))).text();
    if (body.includes(ref)) publicKey = body.match(/sb_publishable_[A-Za-z0-9_-]+/)?.[0] ?? publicKey;
  }
}
if (!publicKey) throw new Error("Chave pública não localizada no site oficial.");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secret, options);
const anonymous = createClient(url, publicKey, options);
const runId = randomUUID();
const manifestPath = `/tmp/pg-backend-real-${runId}.json`;
const evidenceDir = "docs/evidencias-finalizacao-backend-2026-10-13";
const evidence = { runId, ref, startedAt: new Date().toISOString(), checks: [], cleanup: {} };
const accounts = [];
const storage = admin.storage.from("project-images");
const requireOk = ({ error, data }, label) => { if (error) throw new Error(`${label}: ${error.message}`); return data; };
const check = (condition, label) => { assert.ok(condition, label); evidence.checks.push({ label, status: "passed" }); console.info(`PASS ${label}`); };
const persistManifest = () => writeFileSync(manifestPath, JSON.stringify({ ref, accounts: accounts.map(({ id, email, password }) => ({ id, email, password })) }), { mode: 0o600 });

async function list(prefix) {
  const entries = [];
  for (let offset = 0; ; offset += 100) {
    const page = requireOk(await storage.list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } }), "storage inventory");
    entries.push(...page);
    if (page.length < 100) return entries;
  }
}
async function paths(prefix = "") {
  const result = [];
  for (const entry of await list(prefix)) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id) result.push(path);
    else result.push(...await paths(path));
  }
  return result.sort();
}
async function createAccount(label) {
  const email = `qa-backend-${label}-${runId.slice(0, 8)}@example.com`;
  const password = randomBytes(24).toString("hex");
  const data = requireOk(await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: `QA descartável ${label}` } }), "create QA account");
  const account = { id: data.user.id, email, password, client: createClient(url, publicKey, options) };
  accounts.push(account);
  persistManifest();
  requireOk(await account.client.auth.signInWithPassword({ email, password }), "QA login");
  return account;
}
async function runPlaywright(a, b) {
  const args = ["playwright", "test", "tests/e2e/authenticated.spec.ts", "tests/e2e/authenticated-city.spec.ts", "--workers=1"];
  return new Promise((resolve, reject) => {
    const child = spawn("npx", args, { stdio: "inherit", env: {
      ...process.env, CI: "1", PORT: "3107", NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: publicKey, E2E_USER_EMAIL: a.email, E2E_USER_PASSWORD: a.password,
      E2E_SECOND_USER_EMAIL: b.email, E2E_SECOND_USER_PASSWORD: b.password,
    } });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}
async function buildLocally() {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", "build"], { stdio: "inherit", env: {
      ...process.env, NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: publicKey,
      PROFILE_IMAGE_EDITOR_TEST_HARNESS: "1", MODIFICATION_PHOTOS_TEST_HARNESS: "1",
    } });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

const usersBefore = requireOk(await admin.auth.admin.listUsers({ page: 1, perPage: 1000 }), "Auth inventory").users;
const storageBefore = await paths();
evidence.initialInventory = { authUsers: usersBefore.length, storageObjects: storageBefore.length };
let failure;
try {
  if (process.argv.includes("--build")) {
    const code = await buildLocally();
    evidence.localBuild = { exitCode: code };
    if (code !== 0) throw new Error("Local production build failed");
  }
  const a = await createAccount("A");
  const b = await createAccount("B");
  check(requireOk(await a.client.from("profiles").select("id").eq("id", a.id), "own profile").length === 1, "real owner profile read");
  check(requireOk(await b.client.from("profiles").select("id").eq("id", a.id), "foreign profile").length === 0, "real profile isolation A/B");
  check(Boolean(requireOk(await a.client.auth.refreshSession(), "session refresh").session), "real session renewal");
  requireOk(await a.client.auth.signOut(), "logout");
  check((await a.client.auth.getSession()).data.session === null, "real logout removes client session");
  requireOk(await a.client.auth.signInWithPassword({ email: a.email, password: a.password }), "login again");
  const car = requireOk(await a.client.from("cars").insert({ owner_id: a.id, slug: `qa-backend-${runId}`, name: "QA DESCARTAVEL backend", brand: "Volkswagen", model: "Gol", year: 1994, category: "Projeto automotivo", is_public: false, show_expenses_public: false }).select("id").single(), "private project fixture");
  check(requireOk(await a.client.from("cars").select("id").eq("id", car.id), "own project").length === 1, "real private project owner read");
  check(requireOk(await b.client.from("cars").select("id").eq("id", car.id), "foreign project").length === 0 && requireOk(await anonymous.from("cars").select("id").eq("id", car.id), "anonymous project").length === 0, "real private project hidden from B and anonymous API");
  check(requireOk(await b.client.from("cars").update({ city: "Ataque QA" }).eq("id", car.id).select("id"), "foreign update").length === 0, "real foreign project update blocked");
  const catalog = requireOk(await a.client.from("modification_catalog").select("id").eq("is_active", true).limit(1).single(), "catalog fixture");
  const modification = requireOk(await a.client.from("project_modifications").insert({ car_id: car.id, catalog_id: catalog.id, status: "installed", paid_amount: 123, note: "Nota privada fictícia QA" }).select("id").single(), "private modification fixture");
  check(requireOk(await b.client.from("project_modifications").select("id").eq("id", modification.id), "foreign modification").length === 0, "real private modification isolated from B");
  const foreignPath = `${b.id}/modifications/${randomUUID()}.webp`;
  const rejected = await a.client.from("project_modifications").update({ project_photo_storage_path: foreignPath }).eq("id", modification.id);
  check(rejected.error?.code === "42501", "real remote photo ownership policy still rejects B's folder");
  const publicRead = await anonymous.from("project_modifications").select("id").limit(0);
  evidence.publicModifications = { status: publicRead.status, code: publicRead.error?.code ?? null, classification: "blocked_pending_migration" };

  const objectPath = `${a.id}/pending-modifications/${randomUUID()}.webp`;
  requireOk(await storage.upload(objectPath, readFileSync("public/ref/hero-opala-ss.webp"), { contentType: "image/webp", upsert: false }), "disposable image fixture");
  const otherDelete = await b.client.storage.from("project-images").remove([objectPath]);
  check(!otherDelete.error && otherDelete.data.length === 0 && !((await storage.download(objectPath)).error), "real Storage denies B deletion of A's object");
  const publicUrl = storage.getPublicUrl(objectPath).data.publicUrl;
  const publicPhoto = await fetch(publicUrl);
  await publicPhoto.arrayBuffer();
  evidence.publicStorage = { anonymousStatus: publicPhoto.status, classification: publicPhoto.ok ? "private_media_blocker" : "denied" };
  const provider = new URL("/auth/v1/authorize", url);
  provider.searchParams.set("provider", "google");
  provider.searchParams.set("redirect_to", "https://projetogaragem.com.br/auth/callback?next=%2Fgaragem");
  const oauth = await fetch(provider, { headers: { apikey: publicKey }, redirect: "manual" });
  const destination = oauth.headers.get("location");
  evidence.googleOAuth = { status: oauth.status, googleRedirect: destination ? new URL(destination).hostname === "accounts.google.com" : false, interactiveCompletion: "not_tested" };
  if (process.argv.includes("--playwright")) {
    const code = await runPlaywright(a, b);
    evidence.playwright = { exitCode: code };
    if (code !== 0) throw new Error("Playwright authenticated suite failed");
  }
} catch (error) {
  failure = error;
  evidence.error = error.message;
} finally {
  const cleanupErrors = [];
  for (const account of accounts) {
    try {
      requireOk(await account.client.auth.signInWithPassword({ email: account.email, password: account.password }), "cleanup login");
      requireOk(await account.client.from("cars").delete().eq("owner_id", account.id), "cleanup own QA projects");
      check(requireOk(await account.client.from("cars").select("id").eq("owner_id", account.id), "cleanup projects verification").length === 0, "QA account has no remaining projects");
      const objects = await paths(account.id);
      for (let offset = 0; offset < objects.length; offset += 100) requireOk(await storage.remove(objects.slice(offset, offset + 100)), "cleanup own QA objects");
      check((await paths(account.id)).length === 0, "QA account has no remaining Storage objects");
      requireOk(await admin.auth.admin.deleteUser(account.id), "cleanup own QA account");
    } catch (error) {
      cleanupErrors.push({ id: account.id, message: error.message });
    }
  }
  const usersAfter = requireOk(await admin.auth.admin.listUsers({ page: 1, perPage: 1000 }), "final Auth inventory").users;
  const storageAfter = await paths();
  evidence.cleanup = {
    errors: cleanupErrors,
    authUsersAfter: usersAfter.length,
    originalUsersPreserved: usersBefore.every((u) => usersAfter.some((after) => after.id === u.id)),
    ownUsersRemoved: accounts.every((u) => !usersAfter.some((after) => after.id === u.id)),
    storageInventoryPreserved: JSON.stringify(storageBefore) === JSON.stringify(storageAfter),
    storageObjectsAfter: storageAfter.length,
  };
  evidence.finishedAt = new Date().toISOString();
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(`${evidenceDir}/real-${runId}.json`, JSON.stringify(evidence, null, 2));
  if (!cleanupErrors.length && evidence.cleanup.ownUsersRemoved) unlinkSync(manifestPath);
  else console.error(`Cleanup incomplete; recovery manifest: ${manifestPath}`);
  console.info(JSON.stringify({ evidenceFile: `${evidenceDir}/real-${runId}.json`, cleanup: evidence.cleanup }));
  if (cleanupErrors.length || !evidence.cleanup.ownUsersRemoved || !evidence.cleanup.originalUsersPreserved || !evidence.cleanup.storageInventoryPreserved) process.exitCode = 1;
}
if (failure) { console.error(failure.message); process.exitCode = 1; }
