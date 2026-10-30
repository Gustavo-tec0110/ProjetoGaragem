// Only the eight frozen, owner-authorized migrations for the existing project.
// Preparation is the default; writes also require a verified maintenance response.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import console from 'node:console';
import { execFileSync } from 'node:child_process';

const { fetch, AbortSignal } = globalThis;

const project = 'hxqhudfzdwfxnjzmphya';
const args = process.argv.slice(2);
if (args.some(a => !['--apply', '--confirm-project=' + project].includes(a)) || new Set(args).size !== args.length)
  throw new Error('invalid_arguments');
const apply = args.includes('--apply');
if (apply && !args.includes('--confirm-project=' + project)) throw new Error('project_confirmation_required');
if (fs.readFileSync('supabase/.temp/project-ref', 'utf8').trim() !== project) throw new Error('linked_project_mismatch');
const root = path.resolve('artifacts/production-activation');
const manifest = JSON.parse(fs.readFileSync('docs/auditorias/auth/encerramento-tecnico/migration-preflight.json'));
const versions = manifest.migrations.map(m => path.basename(m.file).split('_')[0]);
if (versions.length !== 8 || versions.join(',') !== '20261027120000,20261027210000,20261028010000,20261028120000,20261028121000,20261028122000,20261029010000,20261029181952')
  throw new Error('unexpected_migration_set');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const backup = JSON.parse(fs.readFileSync(root + '/backup-validation.private.json'));
if (!backup.tlsVerified || !backup.portableRestorePassed || !backup.allTableDataMatchesLive ||
    sha(fs.readFileSync(root + '/pre-migrations-backup/full-verified-tls.dump')) !== backup.databaseArchiveSha256)
  throw new Error('verified_backup_required');
const rehearsal = JSON.parse(fs.readFileSync(root + '/cloned-production-migration-rehearsal.private.json'));
if (rehearsal.result !== 'passed' || rehearsal.migrations.length !== 8) throw new Error('rehearsal_required');
const output = root + '/migration-sql';
fs.mkdirSync(output, { recursive: true, mode: 0o700 });
const files = [];
for (const [index, migration] of manifest.migrations.entries()) {
  const source = fs.readFileSync(migration.file, 'utf8');
  if (sha(source) !== migration.sha256 || (source.match(/^begin;\s*$/gim) ?? []).length !== 1 ||
      (source.match(/^commit;\s*$/gim) ?? []).length !== 1) throw new Error('migration_integrity_failed');
  const name = path.basename(migration.file, '.sql').slice(15);
  if (!/^[a-z0-9_]+$/.test(name)) throw new Error('invalid_migration_name');
  const delimiter = '$migration_' + migration.sha256.slice(0, 16) + '$';
  if (source.includes(delimiter)) throw new Error('invalid_delimiter');
  const record = `insert into supabase_migrations.schema_migrations(version,name,statements) values ('${versions[index]}','${name}',array[${delimiter}${source}${delimiter}]::text[]);`;
  const sql = source.replace(/^begin;\s*$/im, "begin;\nset local lock_timeout='5s';\nset local statement_timeout='60s';\nselect pg_advisory_xact_lock(81475877);")
    .replace(/^commit;\s*$/im, record + '\ncommit;');
  const file = output + '/' + path.basename(migration.file);
  fs.writeFileSync(file, sql, { mode: 0o600 });
  files.push(file);
}
if (!apply) {
  console.info(JSON.stringify({ prepared: true, migrations: files.length, remoteWrites: 0 }));
} else {
  const cli = process.env.GARAGEM_SUPABASE_CLI;
  if (!cli || !path.isAbsolute(cli) || !fs.existsSync(cli)) throw new Error('installed_cli_required');
  const draft = JSON.parse(fs.readFileSync(root + '/draft-deploy.private.json'));
  if (draft.state !== 'ready' || draft.siteId !== 'd8154f88-d4e0-43eb-a59b-814758d7de93') throw new Error('ready_compatible_draft_required');
  const query = (sql, label) => {
    const file = root + '/' + label + '.private.sql';
    fs.writeFileSync(file, sql, { mode: 0o600 });
    const log = fs.openSync(root + '/' + label + '.private.log', 'a', 0o600);
    try {
      const result = execFileSync(cli, ['db', 'query', '--linked', '--project-ref', project, '--file', file, '--output-format', 'json'],
        { encoding: 'utf8', timeout: 90000, stdio: ['ignore', 'pipe', log] });
      fs.writeFileSync(root + '/' + label + '.private.json', result, { mode: 0o600 });
      const data = JSON.parse(result);
      if (data.error || !Array.isArray(data.rows)) throw new Error('remote_query_failed');
      return data.rows;
    } finally { fs.closeSync(log); }
  };
  const history = () => query('begin read only; select version from supabase_migrations.schema_migrations order by version; rollback;', 'current-migration-history').map(r => r.version);
  const original = JSON.parse(fs.readFileSync(root + '/preflight-current.private.json')).rows[0].preflight.migrations;
  const current = history();
  const extras = current.filter(v => !original.includes(v));
  if (original.some(v => !current.includes(v)) || extras.some((v, i) => v !== versions[i])) throw new Error('unexpected_remote_history');
  const report = { project, draftDeployId: draft.id, appliedNow: [], previouslyApplied: extras, result: 'running' };
  const save = () => fs.writeFileSync(root + '/migration-execution.private.json', JSON.stringify(report, null, 2), { mode: 0o600 });
  save();
  try {
    for (let i = extras.length; i < files.length; i++) {
      const response = await fetch('https://projetogaragem.com.br/?maintenance-check=' + Date.now(), { redirect: 'manual', signal: AbortSignal.timeout(15000), cache: 'no-store' });
      if (response.status !== 503 || response.headers.get('x-garagem-maintenance') !== 'auth-release-20261030') throw new Error('verified_maintenance_required');
      query(fs.readFileSync(files[i], 'utf8'), 'apply-' + versions[i]);
      if (!history().includes(versions[i])) throw new Error('migration_history_not_recorded');
      report.appliedNow.push(versions[i]); save();
      console.info('PASS migration ' + versions[i]);
    }
    report.result = 'passed'; save();
  } catch {
    report.result = 'failed_stop_and_keep_maintenance'; save();
    console.error('Migration sequence stopped. Preserve maintenance and inspect the private report.');
    process.exitCode = 1;
  }
}
