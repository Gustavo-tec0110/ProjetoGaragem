/* global process, console */
// OFFLINE ONLY. Consumes a private inventory export; has no network, Storage
// mutation, SQL execution or deletion capability.
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { isProjectImagePath, projectImageUrl } from "../src/lib/images/project-image-url.ts";

export function planImageCutover(inventory, uuid = randomUUID) {
  if (inventory.bucket !== "project-images" || !Array.isArray(inventory.objects) || !Array.isArray(inventory.references)) {
    throw new Error("Expected project-images objects and references inventory");
  }
  const objects = new Set();
  const targets = new Set();
  const blocked = [];
  const moves = [];
  for (const object of inventory.objects) {
    if (typeof object.name !== "string" || !isProjectImagePath(object.name) || objects.has(object.name)) {
      blocked.push({ path: object.name, reason: "noncanonical-or-duplicate-key" });
      continue;
    }
    objects.add(object.name);
  }
  for (const reference of inventory.references) {
    if (!objects.has(reference.path) || reference.owner_id !== reference.path.split("/")[0]) {
      blocked.push({ path: reference.path, reason: "missing-object-or-cross-owner-reference" });
    }
  }
  for (const oldPath of objects) {
    const parts = oldPath.split("/");
    const extension = parts.at(-1).split(".").at(-1);
    const target = [...parts.slice(0, -1), `${uuid()}.${extension}`].join("/");
    if (!isProjectImagePath(target) || objects.has(target) || targets.has(target)) throw new Error("Invalid/colliding rotation target");
    targets.add(target);
    moves.push({
      oldPath, newPath: target, newUrl: projectImageUrl(target),
      references: inventory.references.filter((reference) => reference.path === oldPath),
      requiresLeaseReview: parts[1] === "pending-modifications",
    });
  }
  return {
    mode: "offline-plan-only", bucket: inventory.bucket,
    reason: "retire-old-paths-and-possibly-issued-signed-URLs",
    readyForAuthorizedExecution: blocked.length === 0,
    blocked, moves, remoteWrites: 0, deletions: 0,
    gates: ["owner approval", "maintenance and stopped writers", "verified byte backup and hashes", "private bucket",
      "all row/Auth/lease references inventoried", "per-object verified move and DB update", "CDN purge confirmed",
      "old public/signed/optimizer URLs denied from cold clients", "A/B/anonymous checks before reopening"],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , input, output] = process.argv;
  if (!input || !output) throw new Error("Usage: node scripts/plan-project-image-cutover.mjs private-inventory.json private-plan.json");
  const plan = planImageCutover(JSON.parse(readFileSync(input, "utf8")));
  writeFileSync(output, `${JSON.stringify(plan, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  console.info(JSON.stringify({ mode: plan.mode, objects: plan.moves.length, blocked: plan.blocked.length, remoteWrites: 0 }));
}
