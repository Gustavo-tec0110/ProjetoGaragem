// Configure ONLY the existing authorized native loopback stack. Never reads .env.local.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import console from 'node:console';
import { localState, localRoot } from './auth-real-local-utils.mjs';

const env = localState();
const configFile = localRoot + '/supabase/config.toml';
const credentialFile = localRoot + '/google-oauth-test.private.json';
const callback = env.API_URL + '/auth/v1/callback';
let clientId = '', enabled = false;
if (fs.existsSync(credentialFile)) {
  const stat = fs.statSync(credentialFile);
  assert.equal(stat.mode & 0o077, 0, 'Test credential file must be private (0600)');
  const web = JSON.parse(fs.readFileSync(credentialFile, 'utf8')).web;
  assert.equal(web?.project_id, 'garagem-oauth-teste', 'Only the separately authorized Google test project is allowed');
  assert.ok(web.redirect_uris?.includes(callback), 'Test client must authorize the actual local GoTrue callback');
  assert.match(web.client_id, /^[a-zA-Z0-9._-]+\.apps\.googleusercontent\.com$/);
  assert.ok(typeof web.client_secret === 'string' && web.client_secret.length > 8);
  clientId = web.client_id; enabled = true;
}
const section = `\n# Isolated Google test project; production provider is never touched.\n# Google redirect URI: ${callback}\n[auth.external.google]\nenabled = ${enabled}\nclient_id = ${JSON.stringify(clientId)}\nsecret = ${enabled ? '"env(GARAGEM_GOOGLE_TEST_CLIENT_SECRET)"' : '""'}\nskip_nonce_check = false\n`;
const source = fs.readFileSync(configFile, 'utf8');
const existing = /\n\[auth\.external\.google\][\s\S]*?(?=\n\[|$)/;
fs.writeFileSync(configFile, existing.test(source) ? source.replace(existing, section) : source + section);
console.info(JSON.stringify({ localConfigPrepared: true, googleEnabled: enabled, callback,
  credentialsAvailable: enabled, requiresNativeRestart: true, productionChanges: false }));
// On restart, the private launcher must read web.client_secret from credentialFile
// directly into GARAGEM_GOOGLE_TEST_CLIENT_SECRET in the child environment.
