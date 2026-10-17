import assert from "node:assert/strict";
import test from "node:test";
import { planImageCutover } from "../../scripts/plan-project-image-cutover.mjs";

const owner = "11111111-1111-4111-8111-111111111111";
const path = `${owner}/modifications/22222222-2222-4222-8222-222222222222.webp`;
const uuid = () => "33333333-3333-4333-8333-333333333333";

test("offline rotation plan retains every object, every reference and the ownership-compatible folder", () => {
  const references = [{ path, owner_id: owner, source_table: "project_modifications", source_id: "fixture" }];
  const inventory = { bucket: "project-images", objects: [{ name: path }], references };
  const before = JSON.stringify(inventory);
  const plan = planImageCutover(inventory, uuid);
  assert.equal(plan.readyForAuthorizedExecution, true);
  assert.equal(plan.moves[0].newPath, `${owner}/modifications/${uuid()}.webp`);
  assert.deepEqual(plan.moves[0].references, references);
  assert.equal(plan.remoteWrites, 0);
  assert.equal(plan.deletions, 0);
  assert.equal(JSON.stringify(inventory), before);
});

test("cutover plan blocks missing objects, other owners, invalid keys and collisions", () => {
  for (const inventory of [
    { bucket: "project-images", objects: [], references: [{ path, owner_id: owner }] },
    { bucket: "project-images", objects: [{ name: path }], references: [{ path, owner_id: "another" }] },
    { bucket: "project-images", objects: [{ name: "../bad.webp" }], references: [] },
  ]) assert.equal(planImageCutover(inventory, uuid).readyForAuthorizedExecution, false);
  assert.throws(() => planImageCutover({ bucket: "project-images", objects: [{ name: path }], references: [] }, () => path.split("/").at(-1).slice(0,-5)));
});
