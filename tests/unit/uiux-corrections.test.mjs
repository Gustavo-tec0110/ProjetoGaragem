import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { URL, URLSearchParams } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import { requireCaptchaToken, CAPTCHA_REQUIRED } from '../../src/lib/auth/captcha.ts';
import * as legal from '../../src/lib/auth/legal.ts';
import { getGoogleNextPath } from '../../src/lib/auth/redirect.ts';

function loadTs(path, mocks, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: (name) => {
    assert.ok(Object.hasOwn(mocks, name), `Unexpected dependency: ${name}`);
    return mocks[name];
  }, URL, URLSearchParams, ...globals });
  return module.exports;
}
const react = {
  useState: (value) => [value, () => {}], useEffect: () => {},
  useCallback: (fn) => fn, useMemo: (fn) => fn(),
  createContext: () => ({ Provider: 'provider' }),
};
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };

for (const [name, explicit, path, search, expected] of [
  ['login retains next', undefined, '/login', '?next=/criar-projeto', '/criar-projeto'],
  ['register retains next', undefined, '/register', '?next=/onboarding', '/onboarding'],
  ['invitation retains project and query', undefined, '/projeto/opala', '?aba=fotos', '/projeto/opala?aba=fotos'],
  ['invitation ignores unrelated next query', undefined, '/projeto/opala', '?next=/outro', '/projeto/opala?next=/outro'],
  ['explicit destination wins', '/perfil', '/login', '?next=/criar-projeto', '/perfil'],
  ['no destination uses garage', undefined, '/login', '', '/garagem'],
  ['external destination refused', undefined, '/login', '?next=https://example.invalid', '/garagem'],
  ['protocol relative refused', '//example.invalid', '/login', '', '/garagem'],
  ['backslash refused', '/\\example.invalid', '/login', '', '/garagem'],
  ['encoded separator refused', '/%2fexample.invalid', '/login', '', '/garagem'],
  ['login loop refused', '/login?next=/login', '/login', '', '/garagem'],
  ['callback loop refused', '/auth/callback?next=/login', '/login', '', '/garagem'],
]) test(`UIUX-01: ${name}`, () => assert.equal(getGoogleNextPath(explicit, path, search), expected));

test('UIUX-01: actual Google button and AuthProvider preserve destination without contacting OAuth', async () => {
  for (const pathname of ['/login', '/projeto/opala']) {
    let oauth;
    const { AuthProvider } = loadTs('src/components/AuthProvider.tsx', {
      react, 'react/jsx-runtime': jsx,
      '@/lib/supabase/env': { isSupabaseConfigured: true, getSiteUrl: () => 'http://127.0.0.1:3107' },
      '@/lib/auth/redirect': { getGoogleNextPath },
      '@/lib/auth/captcha': { requireCaptchaToken },
      '@/lib/supabase/browser': { getSupabaseBrowserClient: () => ({ auth: { signInWithOAuth: async (args) => { oauth = args; return { error: null }; } } }) },
    }, { window: { location: { pathname, search: '?next=/criar-projeto' } } });
    const auth = AuthProvider({ children: null }).props.value;
    const { GoogleSigninButton } = loadTs('src/components/auth/google-signin-button.tsx', {
      react, 'react/jsx-runtime': jsx, 'lucide-react': { LoaderCircle: 'loader' },
      '@/components/AuthProvider': { useAuth: () => auth }, '@/components/ui/button': { Button: 'button' },
    });
    const rendered = GoogleSigninButton({});
    await rendered.props.children[0].props.onClick();
    assert.equal(oauth.provider, 'google');
    const callback = new URL(oauth.options.redirectTo);
    assert.equal(callback.origin, 'http://127.0.0.1:3107');
    assert.equal(callback.pathname, '/auth/callback');
    assert.equal(callback.searchParams.get('next'), pathname === '/login' ? '/criar-projeto' : '/projeto/opala?next=/criar-projeto');
  }
});

test('UIUX-14: successful registration gives email guidance without infrastructure details', () => {
  let stateIndex = 0;
  const { default: RegisterPage } = loadTs('src/app/(auth)/register/page.tsx', {
    react: { useRef: value => ({current:value}), useState: value => [++stateIndex === 9 ? true : value, () => {}] },
    '@/components/auth/turnstile': { Turnstile:'captcha',useCaptcha:()=>({}) },
    '@/components/auth/terms-checkbox': { TermsCheckbox:'terms' },
    '@/lib/auth/captcha': { CAPTCHA_REQUIRED }, '@/lib/auth/legal':legal,
    'react/jsx-runtime': jsx, 'next/link': { default:'link' },
    '@/components/auth/google-signin-button': { GoogleSigninButton:'google' },
    '@/components/auth/auth-shell': { AuthShell:'shell' },
    '@/components/ui/button': { Button:'button' }, '@/components/ui/input': { Input:'input' },
    '@/components/AuthProvider': { useAuth: () => ({ signUpWithEmail: () => { throw new Error('No registration allowed'); } }) },
  });
  const text = RegisterPage().props.children[0].props.children;
  assert.match(text, /Confira seu email para confirmar a conta/);
  assert.doesNotMatch(text, /Supabase|NEXT_PUBLIC|redirecionamento/);
});

for (const [password, confirm, field, shouldSubmit] of [['a','a','password',false], ['abcdef','abcdeg','confirm',false], ['abcdef','abcdef',null,true]]) {
  test(`UIUX-08: reset validates locally (${field ?? 'valid minimum'})`, async () => {
    const states = [password, confirm, false, '', null];
    const changes = [];
    let focus, updates = 0, pushed;
    const { default: ResetPage } = loadTs('src/app/(auth)/reset-password/page.tsx', {
      react: { useState: () => [states.shift(), value => changes.push(value)] },
      'react/jsx-runtime': jsx, 'next/navigation': { useRouter: () => ({ push: path => { pushed = path; } }) },
      '@/components/auth/auth-shell': { AuthShell:'shell' },
      '@/components/ui/button': { Button:'button' }, '@/components/ui/input': { Input:'input' },
      '@/lib/supabase/browser': { getSupabaseBrowserClient: () => ({auth:{updateUser: async () => {updates++;return {error:null};}}}) },
    }, { document: { getElementById: id => ({ focus: () => { focus = id; } }) } });
    await ResetPage().props.children.props.onSubmit({ preventDefault() {} });
    assert.equal(updates, shouldSubmit ? 1 : 0);
    if (field) { assert.ok(changes.includes(field)); assert.equal(focus, field === 'password' ? 'new-password' : 'confirm-password'); }
    else assert.equal(pushed, '/login');
  });
}
