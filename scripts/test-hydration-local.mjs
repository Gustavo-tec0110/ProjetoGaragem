/* global process, console */
import { constants, mkdtempSync, cpSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

// Never import .env or reuse the real application's build/output.
const root = process.env.HYDRATION_ISOLATED_ROOT ?? mkdtempSync('/tmp/garagem-auth-hydration-');
if (!root.startsWith('/tmp/garagem-auth-')) throw new Error('Disposable /tmp checkout required');
if (readdirSync(root).some(name => /^\.env(?:\.|$)/.test(name))) throw new Error('Refusing checkout containing .env files');
for (const item of ['src', 'public', 'data', 'tests', 'package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json', 'postcss.config.mjs', 'docs/catalogo-2026-10-27/baseline.json'])
  if (existsSync(item)) cpSync(item, path.join(root, item), { recursive: true });
for (const file of readdirSync('.').filter(name => /^playwright.*\.config\.ts$/.test(name))) cpSync(file, path.join(root, file));
// Turbopack resolves within the build root, so node_modules must not be a symlink outside it.
if (!existsSync(path.join(root, 'node_modules'))) cpSync('node_modules', path.join(root, 'node_modules'), { recursive: true, mode: constants.COPYFILE_FICLONE });
const env = { PATH: process.env.PATH, HOME: process.env.HOME, NEXT_TELEMETRY_DISABLED: '1', HYDRATION_ISOLATED_ROOT: root,
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:3199', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'local-fixture-key',
  NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3155', NEXT_PUBLIC_TURNSTILE_MODE: 'test', NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' };
console.info('Isolated production app (no .env): '+root);
const build = spawnSync('npm', ['run', 'build'], { cwd: root, env, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);
const result = spawnSync(path.resolve('node_modules/.bin/playwright'), ['test', '--config=playwright.hydration.config.ts', ...process.argv.slice(2)], { env, stdio: 'inherit' });
process.exitCode = result.status ?? 1;
