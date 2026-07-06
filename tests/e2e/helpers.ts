import { expect, type Page } from "@playwright/test";

export const e2eUser = {
  email: process.env.E2E_USER_EMAIL,
  password: process.env.E2E_USER_PASSWORD,
};

export function hasE2EUser() {
  return Boolean(e2eUser.email && e2eUser.password);
}

export async function login(page: Page, next = "/garagem") {
  if (!hasE2EUser()) {
    throw new Error("Missing E2E_USER_EMAIL/E2E_USER_PASSWORD.");
  }

  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByPlaceholder("Email").fill(e2eUser.email!);
  await page.getByPlaceholder("Senha").fill(e2eUser.password!);
  await page.getByRole("button", { name: /^Entrar$/ }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export function uniqueProjectName() {
  return `E2E Beta 2 ${Date.now()}`;
}
