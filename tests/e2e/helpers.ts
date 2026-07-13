import type { Page } from "@playwright/test";

import { expect } from "./fixtures";

export type E2EAccount = {
  email?: string;
  password?: string;
};

export const e2eUser: E2EAccount = {
  email: process.env.E2E_USER_EMAIL,
  password: process.env.E2E_USER_PASSWORD,
};

export const e2eSecondUser: E2EAccount = {
  email: process.env.E2E_SECOND_USER_EMAIL,
  password: process.env.E2E_SECOND_USER_PASSWORD,
};

function hasE2EUser() {
  return Boolean(e2eUser.email && e2eUser.password);
}

function hasSecondE2EUser() {
  return Boolean(e2eSecondUser.email && e2eSecondUser.password);
}

export function hasAuthenticatedE2EUsers() {
  return hasE2EUser() && hasSecondE2EUser();
}

async function clearAuthState(page: Page) {
  await page.context().clearCookies();
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

export async function login(page: Page, next = "/garagem", account: E2EAccount = e2eUser) {
  if (!account.email || !account.password) {
    throw new Error("Missing E2E account email/password.");
  }

  await clearAuthState(page);
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByPlaceholder("Email").fill(account.email);
  await page.getByPlaceholder("Senha").fill(account.password);
  await page.getByRole("button", { name: /^Entrar$/ }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function logout(page: Page) {
  await page.goto("/");
  const profileMenu = page.getByRole("button", { name: /Abrir menu do perfil/i });
  if (await profileMenu.count()) {
    await profileMenu.first().click();
  }
  await page.getByRole("button", { name: /^Sair$/ }).first().click();
  await expect(page.getByRole("link", { name: /^Entrar$/ }).first()).toBeVisible();
  await clearAuthState(page);
}

export function uniqueProjectName() {
  return `E2E QA ${Date.now()}`;
}
