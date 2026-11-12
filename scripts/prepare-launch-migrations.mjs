// Local preparation only. No network, credentials, CLI invocation or database execution.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const launchVersions = ['20261031120000','20261031121000','20261031122000'];
export function prepareLaunchWindow(snapshot) {
  const files = fs.readdirSync('supabase/migrations').filter(f => launchVersions.includes(f.split('_')[0])).sort();
  if (files.map(f=>f.split('_')[0]).join(',') !== launchVersions.join(',') || launchVersions.some(v => snapshot.migrations.includes(v))) throw new Error('Inspect history again: expected exactly three unapplied migrations');
  const quote = s => `'${s.replaceAll("'", "''")}'`;
  const manifest = files.map(file => {
    const source = fs.readFileSync(`supabase/migrations/${file}`, 'utf8');
    if ((source.match(/^begin;\s*$/gim) ?? []).length !== 1 || (source.match(/^commit;\s*$/gim) ?? []).length !== 1) throw new Error('Unexpected transaction boundary');
    return { file, version:file.split('_')[0], sha256:crypto.createHash('sha256').update(source).digest('hex'), source };
  });
  const history = snapshot.migrations.toSorted().map(quote).join(',');
  const functions = snapshot.functions.filter(f => /^(create_notification|save_car_project_atomic)\(/.test(f.signature));
  if (functions.length !== 2 || functions.some(f => !f.definition)) throw new Error('Baseline function definitions required');
  const checks = functions.map(f => `if md5(pg_get_functiondef(${quote('public.'+f.signature)}::regprocedure)) <> ${quote(crypto.createHash('md5').update(f.definition).digest('hex'))} then raise exception 'Function baseline changed: inspect before applying'; end if;`).join('\n');
  const preamble = `begin;\nset local lock_timeout='5s';\nset local statement_timeout='60s';\nselect pg_advisory_xact_lock(81475877);\ndo $preflight$ begin\nif (select array_agg(version::text order by version) from supabase_migrations.schema_migrations) is distinct from array[${history}]::text[] then raise exception 'Migration history changed: inspect before applying'; end if;\n${checks}\nend $preflight$;\n`;
  const body = manifest.map(m => {
    const stripped = m.source.replace(/^begin;\s*$/im, '').replace(/^commit;\s*$/im, '');
    const name = m.file.slice(15,-4);
    return `\n-- ${m.file}; SHA256 ${m.sha256}\n${stripped}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values (${quote(m.version)},${quote(name)},array[${quote(m.source)}]::text[]);\n`;
  }).join('\n');
  return { sql:preamble+body+'\ncommit;\n', manifest:manifest.map(({file,version,sha256})=>({file,version,sha256})) };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const snapshot = JSON.parse(fs.readFileSync('artifacts/launch-20261101/preflight.private.json','utf8')).rows[0].preflight;
  const result=prepareLaunchWindow(snapshot);
  fs.mkdirSync('artifacts/launch-20261101',{recursive:true,mode:0o700});
  fs.writeFileSync('artifacts/launch-20261101/migration-window.review.sql',result.sql,{mode:0o600});
  fs.writeFileSync('docs/auditorias/fechamento-20261101/migrations-manifest.json',JSON.stringify(result.manifest,null,2)+'\n');
  process.stdout.write('Prepared three migrations in one atomic transaction. No remote writes.\n');
}
