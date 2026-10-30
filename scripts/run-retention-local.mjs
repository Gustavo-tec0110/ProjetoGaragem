// Authorized recovered fixture stack only. Never loads application environment files.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import console from 'node:console';
import { localRoot, localState } from './auth-real-local-utils.mjs';
import { retentionOptions, runRetention, psqlQuery } from './purge-terms-retention.mjs';

const statusFile = localRoot + '/retention-job-status.json';
const healthOnly = process.argv[2] === '--check-health';
if (process.argv.length > (healthOnly ? 3 : 2)) throw new Error('invalid_arguments');
const now = new Date().toISOString();
let previous = {};
try { previous = JSON.parse(fs.readFileSync(statusFile, 'utf8')); } catch { /* First run. */ }
const save = status => {
  const temporary = statusFile + '.' + process.pid;
  fs.writeFileSync(temporary, JSON.stringify(status) + '\n', { mode: 0o600, flag: 'wx' });
  fs.renameSync(temporary, statusFile);
};
try {
  if (healthOnly) {
    const age = Date.now() - Date.parse(previous.lastSuccessAt);
    if (previous.result !== 'passed' || !Number.isFinite(age) || age < 0 || age > 26 * 3600000)
      throw new Error('local_retention_unhealthy_or_stale');
    console.info(JSON.stringify({ result: 'passed', scope: 'local-fixtures', lastSuccessAt: previous.lastSuccessAt }));
  } else {
    const env = localState();
    const config = fs.readFileSync(localRoot + '/supabase/config.toml', 'utf8');
    if (!/^project_id = "garagem-auth-real-recovered"$/m.test(config)) throw new Error('unexpected_local_project');
    const options = retentionOptions(['--apply', '--confirm-host=127.0.0.1', '--limit=100', '--max-batches=10'], env.DB_URL);
    if (options.url.hostname !== '127.0.0.1') throw new Error('loopback_required');
    const binaries = [];
    const walk = directory => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(file);
        else if (entry.name === 'psql' && file.endsWith('/bin/psql')) binaries.push(file);
      }
    };
    walk(localRoot + '/state/cache/stack');
    if (binaries.length !== 1) throw new Error('unique_local_psql_required');
    const result = await runRetention(options, psqlQuery(options.url, binaries[0]));
    const passed = result.complete === true;
    save({ checkedAt: now, scope: 'local-fixtures', result: passed ? 'passed' : 'backlog',
      lastSuccessAt: passed ? now : previous.lastSuccessAt ?? null, ...result });
    console.info(JSON.stringify({ scope: 'local-fixtures', ...result }));
    if (!passed) process.exitCode = 2;
  }
} catch {
  if (!healthOnly) save({ checkedAt: now, scope: 'local-fixtures', result: 'failed', lastSuccessAt: previous.lastSuccessAt ?? null });
  console.error(JSON.stringify({ result: 'failed', scope: 'local-fixtures', reason: healthOnly ? 'unhealthy_or_stale' : 'execution_failed' }));
  process.exitCode = 1;
}
