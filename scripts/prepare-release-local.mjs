// Creates a private, reviewable local build; never commits, uploads or deploys.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import console from 'node:console';
import { spawn } from 'node:child_process';
import nextEnv from '@next/env';

if (process.argv.slice(2).some(arg => arg !== '--build') || process.argv.length > 3) throw new Error('Use optional --build only');
const root = process.cwd();
const reportFile = path.join(root, 'docs/auditorias/auth/encerramento-tecnico/release-preparado.json');
const base = path.join(root, 'artifacts/auth-release');
fs.mkdirSync(base, { recursive: true, mode: 0o700 });
fs.chmodSync(base, 0o700);
const stage = fs.mkdtempSync(path.join(base, 'candidate-'));
fs.chmodSync(stage, 0o700);
const sources = ['src', 'public', 'docs/legal', 'docs/catalogo-2026-10-27/baseline.json',
  'package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json', 'postcss.config.mjs', 'eslint.config.mjs'];
for (const file of sources) {
  if (!fs.existsSync(path.join(root, file))) throw new Error('Missing release input: ' + file);
  fs.mkdirSync(path.dirname(path.join(stage, file)), { recursive: true });
  fs.cpSync(path.join(root, file), path.join(stage, file), { recursive: true });
}
fs.symlinkSync(path.join(root, 'node_modules'), path.join(stage, 'node_modules'), 'dir');
nextEnv.loadEnvConfig(root, false, { info() {}, error() {} });
const publicEnv = {};
for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']) {
  if (!process.env[key]) throw new Error('Missing public environment: ' + key);
  publicEnv[key] = process.env[key];
}
for (const line of fs.readFileSync(path.join(root, '.env.turnstile.production.pending'), 'utf8').split('\n')) {
  const match = line.match(/^(NEXT_PUBLIC_TURNSTILE_SITE_KEY|NEXT_PUBLIC_TURNSTILE_MODE)=(.*)$/);
  if (match) publicEnv[match[1]] = match[2].replace(/^['"]|['"]$/g, '').trim();
}
if (publicEnv.NEXT_PUBLIC_TURNSTILE_MODE !== 'production' ||
    !publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY || /^[123]x0{20}/.test(publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY)) {
  throw new Error('Production public CAPTCHA configuration required');
}
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const sourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else sourceFiles.push({ file: path.relative(stage, file), sha256: sha(fs.readFileSync(file)) });
  }
}
walk(stage);
sourceFiles.sort((a, b) => a.file.localeCompare(b.file));
const report = { createdAt: new Date().toISOString(), stage, productionChanges: false, published: false,
  sourceFiles, publicEnvironmentSha256: Object.fromEntries(Object.entries(publicEnv).map(([key, value]) => [key, sha(value)])),
  productionWidgetProviderReconfirmed: false, buildStatus: 'not-run',
  dependencyScope: 'Uses the installed node_modules; clean lockfile installation remains a separate deployment gate.' };
const save = () => fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
save();
if (process.argv.includes('--build')) {
  const logFile = path.join(base, path.basename(stage) + '.build.private.log');
  const log = fs.openSync(logFile, 'wx', 0o600);
  report.buildStatus = 'running'; save();
  const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'build', '--webpack'], {
    cwd: stage, env: { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'production',
      NEXT_TELEMETRY_DISABLED: '1', ...publicEnv }, stdio: ['ignore', log, log],
  });
  child.on('error', () => { report.buildStatus = 'failed'; save(); process.exitCode = 1; });
  child.on('exit', code => {
    fs.closeSync(log);
    report.buildStatus = code === 0 ? 'passed' : 'failed';
    report.buildExitCode = code;
    report.buildId = fs.existsSync(path.join(stage, '.next/BUILD_ID')) ? fs.readFileSync(path.join(stage, '.next/BUILD_ID'), 'utf8').trim() : null;
    save(); console.info(JSON.stringify({ buildStatus: report.buildStatus, stage, logFile }));
    process.exitCode = code || 0;
  });
} else console.info(JSON.stringify({ prepared: true, stage, buildStatus: report.buildStatus }));
