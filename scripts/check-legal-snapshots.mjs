import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import console from 'node:console';
import process from 'node:process';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(file, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  vm.runInNewContext(code, { exports, require: name => name in imports ? imports[name] : require(name) });
  return exports;
}
const legal = load('src/lib/auth/legal.ts');
const directory = 'docs/legal';
const documents = [['terms', legal.TERMS_VERSION], ['privacy', legal.PRIVACY_VERSION]];
const manifestPath = path.join(directory, 'approved-versions.json');
const freeze = process.argv.includes('--freeze-approved');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
for (const [kind, version] of documents) {
  const source = `src/app/${kind}/page.tsx`;
  const Page = load(source, {
    '@/lib/auth/legal': legal, '@/lib/seo': { createSeoMetadata: () => ({}) },
    'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
  }).default;
  const html = '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>'+version+'</title>'+renderToStaticMarkup(React.createElement(Page))+'</html>\n';
  const sha256 = crypto.createHash('sha256').update(html).digest('hex');
  const destination = path.join(directory, version+'.html');
  if (freeze) {
    if (manifest[version]) throw new Error('Approved snapshots cannot be overwritten: '+version);
    if (fs.existsSync(destination) && fs.readFileSync(destination,'utf8') !== html) throw new Error('Existing snapshot differs: '+version);
    fs.mkdirSync(directory, { recursive: true });
    if (!fs.existsSync(destination)) {
      fs.writeFileSync(destination, html, { mode: 0o444 });
      fs.writeFileSync(path.join(directory, version+'.source.tsx.txt'), fs.readFileSync(source), { mode: 0o444 });
    }
    manifest[version] = { kind, file: destination, sha256, approvedByOwnerOn: '2026-10-29' };
  } else {
    if (manifest[version]?.sha256 !== sha256 || !fs.existsSync(destination) ||
      crypto.createHash('sha256').update(fs.readFileSync(destination)).digest('hex') !== sha256)
      throw new Error('Approved legal content changed without a new version: '+version);
  }
  console.info(`${freeze ? 'FROZEN' : 'PASS'} ${version} ${sha256}`);
}
if (freeze) fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2)+'\n');
