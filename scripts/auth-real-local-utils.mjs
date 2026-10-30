import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';
export const localRoot = '/tmp/garagem-auth-real-20261029';
export function localState() {
  const state = JSON.parse(fs.readFileSync('/tmp/garagem-auth-real-status.private.json', 'utf8'));
  if (state.runtime !== 'native') throw new Error('Only the isolated native runtime is allowed');
  for (const name of ['API_URL', 'DB_URL', 'MAILPIT_URL']) {
    if (new URL(state.env[name]).hostname !== '127.0.0.1') throw new Error('Non-loopback target refused');
  }
  return state.env;
}
export function sqlLocal(sql, file = false) {
  const uri = new URL(localState().DB_URL);
  const binary = execFileSync('find', [localRoot+'/state/cache/stack', '-path', '*/bin/psql'], { encoding:'utf8' }).trim().split('\n')[0];
  return execFileSync(binary, ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', file ? '-f' : '-c', sql], {
    encoding:'utf8', maxBuffer:16*1024*1024,
    env: { PATH:process.env.PATH, HOME:process.env.HOME, PGHOST:uri.hostname, PGPORT:uri.port,
      PGDATABASE:uri.pathname.slice(1), PGUSER:decodeURIComponent(uri.username), PGPASSWORD:decodeURIComponent(uri.password) },
    stdio:['ignore','pipe','pipe'],
  }).trim();
}
