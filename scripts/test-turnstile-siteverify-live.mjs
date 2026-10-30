// Real Cloudflare endpoint with ONLY official public dummy credentials.
// This does not validate a production widget or contact Supabase.
import { writeFileSync, mkdirSync } from 'node:fs';
import process from 'node:process';
import console from 'node:console';
const endpoint = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const pass = '1x0000000000000000000000000000000AA';
const cases = [
  { name: 'official-dummy-success', secret: pass, response: 'XXXX.DUMMY.TOKEN.XXXX', expected: true },
  { name: 'official-dummy-failure', secret: '2x0000000000000000000000000000000AA', response: 'XXXX.DUMMY.TOKEN.XXXX', expected: false },
  { name: 'official-dummy-timeout-or-duplicate', secret: '3x0000000000000000000000000000000AA', response: 'XXXX.DUMMY.TOKEN.XXXX', expected: false },
  { name: 'missing-token', secret: pass, response: '', expected: false },
  { name: 'invalid-token', secret: pass, response: 'not-a-turnstile-token', expected: false },
];
const results = [];
for (const scenario of cases) {
  try {
    const reply = await globalThis.fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: scenario.secret, response: scenario.response }), signal: globalThis.AbortSignal.timeout(15000) });
    const data = await reply.json();
    results.push({ name: scenario.name, http: reply.status, success: data.success === true,
      errorCodes: data['error-codes'] ?? [], matchesExpectation: (data.success === true) === scenario.expected });
  } catch (error) { results.push({ name: scenario.name, networkError: error.name, matchesExpectation: false }); }
}
const evidence = { mode: 'real-cloudflare-siteverify-official-dummy-keys', productionWidgetValidated: false,
  supabaseAuthValidated: false, actualExpiryOrReplayValidated: false, results };
mkdirSync('docs/auditorias/auth/finalizacao', { recursive: true });
writeFileSync('docs/auditorias/auth/finalizacao/siteverify-real-dummy.json', JSON.stringify(evidence, null, 2)+'\n');
console.info(JSON.stringify(evidence));
process.exitCode = results.every(result => result.matchesExpectation) ? 0 : 1;
