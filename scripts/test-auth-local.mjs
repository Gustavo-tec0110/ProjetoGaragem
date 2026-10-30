/* global process, console */
import { mkdtempSync, cpSync, symlinkSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const root=process.env.AUTH_ISOLATED_ROOT??mkdtempSync('/tmp/garagem-auth-');
if(!root.startsWith('/tmp/garagem-auth-'))throw new Error('Only isolated /tmp checkouts are permitted');
for(const item of ['src','public','package.json','package-lock.json','next.config.ts','tsconfig.json','postcss.config.mjs','docs/catalogo-2026-10-27/baseline.json'])
  if(existsSync(item))cpSync(item,path.join(root,item),{recursive:true});
if(!existsSync(path.join(root,'node_modules')))symlinkSync(path.resolve('node_modules'),path.join(root,'node_modules'),'dir');
console.info('Isolated app (no .env copied): '+root);
const result=spawnSync(path.resolve('node_modules/.bin/playwright'),['test','--config=playwright.auth.config.ts',...process.argv.slice(2)],{
  stdio:'inherit',env:{PATH:process.env.PATH,HOME:process.env.HOME,AUTH_ISOLATED_ROOT:root,FORCE_COLOR:'0',NEXT_TELEMETRY_DISABLED:'1'},
});
process.exitCode=result.status??1;
