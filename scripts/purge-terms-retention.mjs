// Private SQL connection only. Does not load the application's .env.local.
import { execFileSync } from 'node:child_process';
import { pathToFileURL, URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';

export const retentionInspectionSql = `select json_build_object(
  'eligible', count(*) filter (where retention_until <= now() and
    (legal_hold_until is null or legal_hold_until <= now())),
  'held', count(*) filter (where legal_hold_until > now()),
  'expiredHolds', count(*) filter (where legal_hold_until <= now()),
  'future', count(*) filter (where retention_until > now())
) from legal_private.terms_acceptances where user_id is null`;

export function retentionOptions(args, rawUrl) {
  const allowed = /^(--apply|--confirm-host=[a-zA-Z0-9.:-]+|--limit=\d+|--max-batches=\d+)$/;
  if (args.some(arg => !allowed.test(arg))) throw new Error('invalid_arguments');
  if (new Set(args.map(arg => arg.split('=')[0])).size !== args.length) throw new Error('duplicate_arguments');
  let url;
  try { url = new URL(rawUrl); } catch { throw new Error('database_url_required'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.pathname.slice(1))
    throw new Error('invalid_database_url');
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (!loopback && url.searchParams.get('sslmode') !== 'verify-full') throw new Error('remote_requires_verify_full');
  const value = (name, fallback) => Number(args.find(arg => arg.startsWith(name + '='))?.split('=')[1] ?? fallback);
  const limit = value('--limit', 1000), maxBatches = value('--max-batches', 100);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10000 ||
      !Number.isSafeInteger(maxBatches) || maxBatches < 1 || maxBatches > 1000) throw new Error('invalid_batch_bounds');
  const apply = args.includes('--apply');
  if (apply && !args.includes('--confirm-host=' + url.hostname)) throw new Error('explicit_host_confirmation_required');
  return { url, apply, limit, maxBatches };
}

export async function runRetention({ apply, limit, maxBatches }, query) {
  const inspection = await query(retentionInspectionSql);
  if (!apply) return { mode: 'inspect', ...inspection, deleted: 0 };
  let deleted = 0;
  for (let batch = 0; batch < maxBatches; batch++) {
    const count = Number(await query(`select legal_private.purge_expired_terms_acceptances(${limit})`));
    if (!Number.isSafeInteger(count) || count < 0 || count > limit) throw new Error('invalid_purge_response');
    deleted += count;
    if (count === 0) break;
  }
  // SKIP LOCKED can return zero while another worker holds eligible records.
  // Recount before claiming that the queue is empty.
  const remaining = await query(retentionInspectionSql);
  return { mode: 'apply', ...remaining, deleted, complete: Number(remaining.eligible) === 0 };
}

export function psqlQuery(url, binary = 'psql') {
  return sql => {
    // The URL/password never appears in argv, logs or process error messages.
    const env = {
      PATH: process.env.PATH, HOME: process.env.HOME,
      PGHOST: url.hostname.replace(/^\[|\]$/g, ''), PGPORT: url.port || '5432',
      PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
      PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
      PGSSLMODE: url.searchParams.get('sslmode') || 'disable',
      PGSSLROOTCERT: process.env.PGSSLROOTCERT,
      PGCONNECT_TIMEOUT: '10', PGAPPNAME: 'garagem-terms-retention',
      PGOPTIONS: '-c statement_timeout=30000 -c lock_timeout=5000',
    };
    try {
      const output = execFileSync(binary, ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', sql], {
        env, encoding: 'utf8', timeout: 40000, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 65536,
      }).trim();
      return JSON.parse(output);
    } catch { throw new Error('private_sql_failed_no_further_batches'); }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = retentionOptions(process.argv.slice(2), process.env.GARAGEM_RETENTION_DATABASE_URL);
    const result = await runRetention(options, psqlQuery(options.url, process.env.GARAGEM_PSQL_BINARY));
    console.info(JSON.stringify(result));
    if (result.complete === false) process.exitCode = 2;
  } catch (error) {
    console.error(JSON.stringify({ result: 'failed', reason: error.message }));
    process.exitCode = 1;
  }
}
