// Diagnostic only: real local GoTrue settings + authorization redirect.
// Never follows Google redirects, logs state/codes or authenticates a person.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { URL } from 'node:url';
import console from 'node:console';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import { localState } from './auth-real-local-utils.mjs';

const result = { mode: 'local-real-gotrue-preflight', googleOAuthRealValidated: false, productionChanges: false };
try {
  const env = localState();
  const appOrigin = 'http://127.0.0.1:3196';
  result.applicationCallback = appOrigin + '/auth/callback';
  result.googleAuthorizedRedirectUri = env.API_URL + '/auth/v1/callback';
  const settings = await globalThis.fetch(env.API_URL + '/auth/v1/settings', {
    headers: { apikey: env.ANON_KEY }, signal: globalThis.AbortSignal.timeout(10000), redirect: 'error',
  });
  assert.equal(settings.status, 200);
  result.googleProviderEnabled = (await settings.json()).external?.google === true;
  const sdk = createClient(env.API_URL, env.ANON_KEY, {
    auth: { flowType: 'pkce', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await sdk.auth.signInWithOAuth({ provider: 'google', options: {
    redirectTo: result.applicationCallback + '?next=%2Fonboarding', skipBrowserRedirect: true,
  } });
  assert.ifError(error);
  const authUrl = new URL(data.url);
  assert.equal(authUrl.origin, new URL(env.API_URL).origin);
  assert.equal(authUrl.searchParams.get('code_challenge_method'), 's256');
  assert.ok(authUrl.searchParams.get('code_challenge'));
  result.pkceS256Generated = true;
  const response = await globalThis.fetch(authUrl, { redirect: 'manual', signal: globalThis.AbortSignal.timeout(10000) });
  result.localAuthorizeStatus = response.status;
  const location = response.headers.get('location');
  if (location) {
    const googleUrl = new URL(location);
    result.redirectsToGoogle = googleUrl.origin === 'https://accounts.google.com';
    result.googleCallbackMatches = googleUrl.searchParams.get('redirect_uri') === result.googleAuthorizedRedirectUri;
  } else result.redirectsToGoogle = false;
  result.blocker = result.googleProviderEnabled && result.redirectsToGoogle
    ? 'interactive_test_account_login_required' : 'separate_test_google_client_configuration_required';
} catch {
  result.blocker = 'isolated_runtime_unavailable_or_preflight_failed';
  process.exitCode = 1;
}
fs.mkdirSync('docs/auditorias/auth/encerramento-tecnico', { recursive: true });
fs.writeFileSync('docs/auditorias/auth/encerramento-tecnico/google-preflight.json', JSON.stringify(result, null, 2) + '\n');
console.info(JSON.stringify(result));
