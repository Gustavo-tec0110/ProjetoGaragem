// Restricted to the existing disposable native loopback cluster. Never uses .env.local.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import process from 'node:process';
import console from 'node:console';
import { URL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { localRoot, localState } from './auth-real-local-utils.mjs';

const source = new URL(localState().DB_URL);
assert.equal(source.hostname, '127.0.0.1');
const psql = execFileSync('find', [localRoot + '/state/cache/stack', '-path', '*/bin/psql'], { encoding: 'utf8' }).trim().split('\n')[0];
const bin = path.dirname(psql);
const target = 'garagem_restore_qa_' + crypto.randomBytes(5).toString('hex');
const backupDir = fs.mkdtempSync(localRoot + '/restore-check-');
fs.chmodSync(backupDir, 0o700);
const archive = path.join(backupDir, 'isolated.dump');
const log = fs.openSync(path.join(backupDir, 'restore.private.log'), 'wx', 0o600);
const env = {
  PATH: process.env.PATH, HOME: process.env.HOME,
  PGHOST: source.hostname, PGPORT: source.port,
  // Native Supabase's restore principal owns the platform schemas. The regular
  // postgres role cannot SET ROLE to supabase_admin when restoring their owners.
  PGUSER: 'supabase_admin', PGPASSWORD: decodeURIComponent(source.password),
  PGDATABASE: source.pathname.slice(1), PGCONNECT_TIMEOUT: '10',
};
const run = (name, args, database = env.PGDATABASE, capture = false) => execFileSync(path.join(bin, name), args, {
  env: { ...env, PGDATABASE: database }, timeout: 120000,
  encoding: 'utf8', stdio: ['ignore', capture ? 'pipe' : log, log],
});
const fingerprintSql = `select json_build_object(
 'users',(select count(*) from auth.users),
 'identities',(select count(*) from auth.identities),
 'receipts',(select count(*) from legal_private.terms_acceptances),
 'receiptDigest',(select md5(coalesce(string_agg(to_jsonb(t)::text, '|' order by id),'')) from legal_private.terms_acceptances t),
 'policies',(select md5(coalesce(string_agg(to_jsonb(p)::text,'|' order by schemaname,tablename,policyname),'')) from pg_policies p where schemaname in ('public','legal_private','storage')),
 'functions',(select md5(coalesce(string_agg(n.nspname||p.proname||p.prosrc,'|' order by n.nspname,p.proname,p.oid::regprocedure::text),'')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','legal_private')),
 -- Catalog name necessarily differs in a separately named restore database.
 'grants',(select md5(coalesce(string_agg((to_jsonb(g)-'table_catalog')::text,'|' order by (to_jsonb(g)-'table_catalog')::text),'')) from information_schema.table_privileges g where table_schema in ('public','legal_private','storage')),
 'rls',(select md5(coalesce(string_agg(n.nspname||c.relname||c.relrowsecurity::text||c.relforcerowsecurity::text,'|' order by n.nspname,c.relname),'')) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','legal_private','storage') and c.relkind='r'),
 'ownershipAndAcls',(select md5(coalesce(string_agg(row_to_json(a)::text,'|' order by row_to_json(a)::text),'')) from (
   select 'schema' as kind,nspname as object,pg_get_userbyid(nspowner) as owner,
     (select json_agg(x::text order by x::text) from unnest(coalesce(nspacl,acldefault('n',nspowner))) x) as acl
   from pg_namespace where nspname in ('public','legal_private','storage')
   union all
   select 'relation',n.nspname||'.'||c.relname,pg_get_userbyid(c.relowner),
     (select json_agg(x::text order by x::text) from unnest(coalesce(c.relacl,acldefault(case when c.relkind='S' then 'S'::"char" else 'r'::"char" end,c.relowner))) x)
   from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','legal_private','storage')
   union all
   select 'function',n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',pg_get_userbyid(p.proowner),
     (select json_agg(x::text order by x::text) from unnest(coalesce(p.proacl,acldefault('f',p.proowner))) x)
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','legal_private','storage')
   union all
   select 'default',coalesce(n.nspname,'*')||':'||d.defaclobjtype::text,pg_get_userbyid(d.defaclrole),
     (select json_agg(x::text order by x::text) from unnest(d.defaclacl) x)
   from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace
   where n.nspname in ('public','legal_private','storage') or d.defaclnamespace=0
 ) a)
)`;
const fingerprint = db => JSON.parse(run('psql', ['-XqAt', '-v', 'ON_ERROR_STOP=1', '-c', fingerprintSql], db, true));
const report = { checkedAt: new Date().toISOString(), scope: 'disposable-local-database-only', productionChanges: false, hostedBackupVerified: false, storageObjectsVerified: false, database: target, privateArchive: archive };
try {
  const before = fingerprint(env.PGDATABASE);
  run('pg_dump', ['--format=custom', '--file=' + archive]);
  fs.chmodSync(archive, 0o600);
  run('pg_restore', ['--list', archive]);
  run('createdb', ['--template=template0', target]);
  run('pg_restore', ['--exit-on-error', '--no-tablespaces', '--dbname=' + target, archive], target);
  const after = fingerprint(target);
  report.integrityChecks = Object.fromEntries(Object.keys(before).map(key => [key, before[key] === after[key]]));
  assert.deepEqual(after, before, 'Restored data and security metadata must match');
  report.result = 'passed';
  report.checks = ['archive-readable', 'full-database-restore', 'account-identity-receipt-counts', 'receipt-content-digest', 'RLS-policies-and-flags', 'function-bodies', 'table-grants', 'schema-relation-function-default-ownership-and-ACLs'];
  report.sha256 = crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
} catch {
  report.result = 'failed';
  report.privateLog = path.join(backupDir, 'restore.private.log');
  process.exitCode = 1;
} finally {
  fs.closeSync(log);
  // Retain only this run's artifacts for the separately authorized cleanup.
  fs.writeFileSync('docs/auditorias/auth/encerramento-tecnico/backup-restore-local.json', JSON.stringify(report, null, 2) + '\n');
  console.info(JSON.stringify(report));
}
