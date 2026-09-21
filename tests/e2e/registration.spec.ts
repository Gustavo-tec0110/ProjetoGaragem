import { expect, test } from "@playwright/test";

test("novo usuario solicita cadastro pelo formulario oficial", async ({ page }) => {
  const signupEmail = process.env.E2E_SIGNUP_EMAIL;
  const signupPassword = process.env.E2E_USER_PASSWORD;
  test.skip(!signupEmail || !signupPassword, "O runner oficial deve fornecer a conta descartável.");

  await page.goto("/register");
  await page.getByLabel("Nome completo").fill("E2E Cadastro Projeto Garagem");
  await page.getByLabel("Email").fill(signupEmail!);
  await page.getByLabel("Senha", { exact: true }).fill(signupPassword!);
  await page.getByLabel("Confirmar senha").fill(signupPassword!);

  const signupResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/auth/v1/signup") && response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Criar conta" }).click();
  const signupResponse = await signupResponsePromise;
  const signupPayload = (await signupResponse.json()) as {
    access_token?: string;
    code?: string;
    error_code?: string;
  };

  test.skip(
    signupResponse.status() === 429 &&
      [signupPayload.code, signupPayload.error_code].includes("over_email_send_rate_limit"),
    "O Supabase oficial atingiu a quota de envio de email; repita o cadastro quando a janela resetar."
  );
  expect(signupResponse.ok()).toBe(true);

  if (signupPayload.access_token) {
    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 30_000 });
  } else {
    await expect(page.getByText(/Cadastro iniciado.*verifique seu email/i)).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  }
});
