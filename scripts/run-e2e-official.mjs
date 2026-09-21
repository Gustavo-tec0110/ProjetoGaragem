import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const PROJECT_REF = "hxqhudfzdwfxnjzmphya";
const url = process.env.QA_SUPABASE_URL;
const anonKey = process.env.QA_SUPABASE_ANON_KEY;
const serviceKey = process.env.QA_SUPABASE_SERVICE_KEY;

if (!url?.includes(PROJECT_REF) || !anonKey || !serviceKey) {
  throw new Error("E2E environment is not configured for ProjetoGaragem.");
}

const service = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const password = `E2E!${randomUUID()}aA9`;
const signupEmail = `e2e-projeto-garagem-signup-${runId}@example.com`;
const users = [];

async function createUser(label) {
  const email = `e2e-projeto-garagem-${label}-${runId}@example.invalid`;
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `E2E Projeto Garagem ${label}`, username: `e2e_${label}_${runId}` },
  });
  if (created.error || !created.data.user) throw created.error ?? new Error("E2E user was not created.");

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signedIn = await authClient.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  const user = { id: created.data.user.id, email, authClient };
  users.push(user);
  return user;
}

let exitCode;
try {
  const [first, second] = await Promise.all([createUser("a"), createUser("b")]);
  const testArgs = process.argv.slice(2);
  const command = ["npx.cmd", "playwright", "test", ...testArgs].join(" ");
  const result = spawnSync("cmd.exe", ["/d", "/s", "/c", command], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
      E2E_USER_EMAIL: first.email,
      E2E_USER_PASSWORD: password,
      E2E_SECOND_USER_EMAIL: second.email,
      E2E_SECOND_USER_PASSWORD: password,
      E2E_SIGNUP_EMAIL: signupEmail,
    },
  });
  exitCode = result.status ?? 1;
} finally {
  for (const user of users) {
    const listed = await user.authClient.storage.from("project-images").list(user.id, { limit: 100 });
    if (!listed.error && listed.data.length) {
      await user.authClient.storage
        .from("project-images")
        .remove(listed.data.map((entry) => `${user.id}/${entry.name}`));
    }
    await user.authClient.from("cars").delete().eq("owner_id", user.id);
    await service.auth.admin.deleteUser(user.id);
  }
  const listedUsers = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (!listedUsers.error) {
    const signupUser = listedUsers.data.users.find((user) => user.email === signupEmail);
    if (signupUser) await service.auth.admin.deleteUser(signupUser.id);
  }
}

process.exitCode = exitCode ?? 1;
