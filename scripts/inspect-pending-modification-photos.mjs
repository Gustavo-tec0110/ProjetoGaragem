/* global process, URL, console */
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { pendingPhotoCandidate } from "./pending-photo-cleanup-policy.mjs";

nextEnv.loadEnvConfig(process.cwd());
const EXPECTED_REF = "hxqhudfzdwfxnjzmphya";
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apply = process.argv.includes("--apply");
const legacyInventory = process.argv.includes("--legacy-inventory");
if (!url || new URL(url).origin !== `https://${EXPECTED_REF}.supabase.co` || !key) {
  throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para o Project Ref esperado.");
}
if (apply && legacyInventory) throw new Error("O inventário de arquivos legados é somente de leitura.");
if (apply && !process.argv.includes(`--confirm-ref=${EXPECTED_REF}`)) {
  throw new Error("Para excluir, informe --apply e --confirm-ref com o Project Ref confirmado.");
}

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const storage = client.storage.from("project-images");

async function listAll(prefix) {
  const entries = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await storage.list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
    if (error || !data) throw new Error(`Falha ao listar Storage em ${prefix || "raiz"}: ${error?.message ?? "resposta vazia"}`);
    entries.push(...data);
    if (data.length < 100) return entries;
  }
}

const now = Date.now();
let scanned = 0;
let candidates = 0;
let removed = 0;
let failures = 0;
let objects = [];
if (legacyInventory) {
  for (const folder of await listAll("")) {
    if (!/^[0-9a-f-]{36}$/i.test(folder.name)) continue;
    const prefix = `${folder.name}/pending-modifications`;
    for (const object of await listAll(prefix)) {
      scanned++;
      const path = `${prefix}/${object.name}`;
      if (pendingPhotoCandidate(path, object.created_at, now)) objects.push({ path, created_at: object.created_at });
    }
  }
} else {
  const limitArgument = process.argv.find((value) => value.startsWith("--limit="))?.split("=")[1];
  const limit = Math.max(1, Math.min(500, Number.parseInt(limitArgument ?? "100", 10) || 100));
  const { data, error } = await client.rpc("inspect_stale_pending_modification_photos", { p_limit: limit });
  if (error || !Array.isArray(data)) throw new Error(`Inspeção indisponível; nenhuma exclusão: ${error?.message ?? "resposta inválida"}`);
  objects = data;
  scanned = data.length;
}
for (const object of objects) {
  const path = object.path;
  if (!pendingPhotoCandidate(path, object.created_at, now)) continue;
  candidates++;
  if (!apply) {
    console.info(JSON.stringify({ action: "inspect", path, createdAt: object.created_at, referenceAndLease: legacyInventory ? "not_checked" : "eligible_at_inspection" }));
    continue;
  }
  const { data: claimed, error: claimError } = await client.rpc("claim_stale_pending_modification_photo", { p_path: path });
  if (claimError) throw new Error(`Falha de verificação no banco; nenhuma exclusão adicional: ${claimError.message}`);
  if (claimed !== true) {
    console.info(JSON.stringify({ action: "skip", path, reason: "referenced_or_active_or_untracked_or_missing" }));
    continue;
  }
  const { error: removeError } = await storage.remove([path]);
  if (removeError) {
    failures++;
    console.error(JSON.stringify({ action: "remove.failed", path, message: removeError.message }));
    continue;
  }
  removed++;
  console.info(JSON.stringify({ action: "removed", path }));
}
if (apply) {
  const { error } = await client.rpc("prune_pending_modification_photo_leases");
  if (error) {
    failures++;
    console.error(JSON.stringify({ action: "leases.prune.failed", message: error.message }));
  }
}
console.info(JSON.stringify({ mode: apply ? "apply" : "inspect", legacyInventory, scanned, candidates, removed, failures }));
if (failures) process.exitCode = 1;
