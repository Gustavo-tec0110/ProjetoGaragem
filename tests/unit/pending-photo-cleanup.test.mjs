import { test } from "node:test";
import assert from "node:assert/strict";
import { pendingPhotoCandidate, MIN_AGE_MS } from "../../scripts/pending-photo-cleanup-policy.mjs";

const path = "ab15252b-7e74-499b-a32c-99078cbe55ec/pending-modifications/2a65fb18-c4cf-4b32-a395-fc22e281560f.webp";
const now = Date.UTC(2026, 9, 14);
test("cleanup age and path gate", () => {
  assert.equal(pendingPhotoCandidate(path, new Date(now - MIN_AGE_MS - 1).toISOString(), now), true);
  assert.equal(pendingPhotoCandidate(path, new Date(now - MIN_AGE_MS + 1).toISOString(), now), false);
  assert.equal(pendingPhotoCandidate(path.replace("pending-modifications", "modifications"), new Date(0).toISOString(), now), false);
  assert.equal(pendingPhotoCandidate(path.replace("ab15252b", "otherxxx"), new Date(0).toISOString(), now), false);
  assert.equal(pendingPhotoCandidate(path, null, now), false);
});
