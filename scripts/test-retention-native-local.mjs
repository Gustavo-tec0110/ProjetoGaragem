// Only the previously authorized native loopback runtime; disposable receipts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import console from 'node:console';
import { localState, sqlLocal, localRoot } from './auth-real-local-utils.mjs';
import { retentionInspectionSql } from './purge-terms-retention.mjs';

const env = localState();
const binary = execFileSync('find', [localRoot + '/state/cache/stack', '-path', '*/bin/psql'], { encoding: 'utf8' }).trim().split('\n')[0];
const ids = [randomUUID(), randomUUID(), randomUUID()];
const checks = [];
const worker = args => JSON.parse(execFileSync(process.execPath, ['scripts/purge-terms-retention.mjs', ...args], {
  env: { PATH: process.env.PATH, HOME: process.env.HOME, GARAGEM_RETENTION_DATABASE_URL: env.DB_URL, GARAGEM_PSQL_BINARY: binary },
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000,
}));
try {
  assert.equal(JSON.parse(sqlLocal(retentionInspectionSql)).eligible, 0, 'Refuse to purge unrelated expired local fixtures');
  const before = Number(sqlLocal('select count(*) from legal_private.terms_acceptances'));
  for (let i = 0; i < ids.length; i++) sqlLocal(`insert into legal_private.terms_acceptances
    (id,terms_version,privacy_version,accepted_at,account_closed_at,retention_until,retention_basis,legal_hold_until,legal_hold_reason)
    values ('${ids[i]}','terms-v1','privacy-v1',now()-interval '7 years',now()-interval '6 years',now()-interval '1 year','legal_claims',
    ${i === 2 ? "now()+interval '1 day','native fixture'" : i === 1 ? "now()-interval '1 day','expired native fixture'" : 'null,null'});`);
  const inspect = worker([]);
  assert.equal(inspect.mode, 'inspect'); assert.equal(inspect.eligible, 2); assert.equal(inspect.deleted, 0);
  assert.equal(Number(sqlLocal('select count(*) from legal_private.terms_acceptances')), before + 3);
  checks.push('real psql inspection leaves receipts untouched');
  const apply = worker(['--apply', '--confirm-host=127.0.0.1', '--limit=1', '--max-batches=2']);
  assert.equal(apply.deleted, 2); assert.equal(apply.complete, true);
  assert.equal(Number(sqlLocal('select count(*) from legal_private.terms_acceptances')), before + 1);
  assert.equal(sqlLocal(`select count(*) from legal_private.terms_acceptances where id='${ids[2]}'`), '1');
  checks.push('real psql batches delete only expired fixtures and preserve finite hold');
  console.info(JSON.stringify({ mode: 'real-native-postgresql-psql-worker', checks, productionChanges: false }));
  fs.mkdirSync('docs/auditorias/auth/encerramento-tecnico', { recursive: true });
  fs.writeFileSync('docs/auditorias/auth/encerramento-tecnico/retention-native.json', JSON.stringify({
    mode: 'real-native-postgresql-psql-worker', checks, result: 'passed', productionChanges: false,
  }, null, 2) + '\n');
} finally {
  sqlLocal(`delete from legal_private.terms_acceptances where id in (${ids.map(id => `'${id}'`).join(',')})`);
}
