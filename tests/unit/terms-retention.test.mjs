import assert from 'node:assert/strict';
import test from 'node:test';
import { retentionOptions, runRetention } from '../../scripts/purge-terms-retention.mjs';

test('purge requires explicit host confirmation and verified TLS remotely', () => {
  const local = 'postgresql://postgres:fixture@127.0.0.1:5432/postgres';
  assert.equal(retentionOptions([], local).apply, false);
  assert.throws(() => retentionOptions(['--apply'], local), /confirmation/);
  assert.equal(retentionOptions(['--apply', '--confirm-host=127.0.0.1'], local).apply, true);
  for (const args of [['--limit=0'], ['--max-batches=1001'], ['--limit=1', '--limit=2'], ['--unknown']])
    assert.throws(() => retentionOptions(args, local));
  assert.throws(() => retentionOptions([], 'postgresql://admin:fixture@db.example.invalid/postgres'), /verify_full/);
  assert.equal(retentionOptions([], 'postgresql://admin:fixture@db.example.invalid/postgres?sslmode=verify-full').apply, false);
});

test('inspection never calls purge; bounded worker reports remaining backlog', async () => {
  const calls = [];
  const query = async sql => { calls.push(sql); return sql.includes('json_build_object') ? { eligible: 3, held: 1 } : 2; };
  const options = { apply: false, limit: 2, maxBatches: 2 };
  assert.equal((await runRetention(options, query)).deleted, 0);
  assert.equal(calls.length, 1);
  calls.length = 0;
  const result = await runRetention({ ...options, apply: true }, query);
  assert.equal(result.deleted, 4); assert.equal(result.complete, false);
  assert.equal(calls.filter(sql => sql.includes('purge_expired')).length, 2);
});

test('empty SKIP LOCKED batch does not prove completion; SQL failures stop worker', async () => {
  const result = await runRetention({ apply: true, limit: 10, maxBatches: 3 }, async sql =>
    sql.includes('json_build_object') ? { eligible: 1 } : 0);
  assert.equal(result.complete, false);
  let calls = 0;
  await assert.rejects(runRetention({ apply: true, limit: 10, maxBatches: 3 }, async () => {
    if (++calls > 1) throw new Error('database_unavailable');
    return { eligible: 1 };
  }), /database_unavailable/);
  assert.equal(calls, 2);
});
