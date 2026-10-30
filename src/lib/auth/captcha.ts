export const CAPTCHA_UNAVAILABLE = "Verificação de segurança indisponível. Tente novamente mais tarde.";
export const CAPTCHA_REQUIRED = "Conclua a verificação de segurança para continuar.";

export function captchaConfiguration(siteKey: string | undefined, mode: string | undefined, hostname: string) {
  const key = siteKey?.trim() ?? "";
  const testKey = /^[123]x0{20}(AA|AB|BB|FF)$/.test(key);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
  if (!key || !["test", "production"].includes(mode ?? "") ||
    (mode === "test" && (!local || !testKey)) || (mode === "production" && testKey)) {
    return { siteKey: "", error: CAPTCHA_UNAVAILABLE };
  }
  return { siteKey: key, error: null };
}

export function requireCaptchaToken(token?: string) {
  if (!token || token.length > 2048) throw new Error(CAPTCHA_REQUIRED);
  return token;
}
