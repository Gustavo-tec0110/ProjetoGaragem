"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { GoogleSigninButton } from "@/components/auth/google-signin-button";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/AuthProvider";

import { Turnstile, useCaptcha } from "@/components/auth/turnstile";
import { TermsCheckbox } from "@/components/auth/terms-checkbox";
import { CAPTCHA_REQUIRED } from "@/lib/auth/captcha";
import { TERMS_REQUIRED_MESSAGE, TERMS_VERSION, PRIVACY_VERSION } from "@/lib/auth/legal";

export default function RegisterPage() {
  const { signUpWithEmail } = useAuth();

  const captcha = useCaptcha();
  const submitting = useRef(false);
  const [termsError, setTermsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (data: FormData) => {
    // React replays early submissions with the native controls, including pre-hydration typing.
    // Cancel automatic action resets below to keep those controls on validation/API errors.
    const fullName = String(data.get("fullName") ?? "");
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");
    if (submitting.current) return;
    setError("");
    const accepted = data.get("acceptTerms") === "on";
    setTermsError(!accepted);
    if (!accepted) { setError(TERMS_REQUIRED_MESSAGE); return; }
    if (!captcha.token) { setError(CAPTCHA_REQUIRED); return; }
    if (password.length < 6) {
      setError("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    submitting.current = true;
    setLoading(true);
    try {
      const { error: signUpError, hasSession } = await signUpWithEmail(email, password, fullName, captcha.token);

      if (signUpError) {
        if (signUpError.code === "user_already_exists" || signUpError.code === "email_exists") {
          setSuccess(true);
          return;
        }
        setError("Não foi possível iniciar o cadastro. Confira os dados e refaça a verificação de segurança.");
        return;
      }

      if (hasSession) {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        const session = (await sessionResponse.json()) as { authenticated?: boolean };
        if (!sessionResponse.ok || !session.authenticated) {
          setLoading(false);
          setError("A sessão não pôde ser confirmada. Tente entrar novamente.");
          return;
        }
        const acceptance = await fetch("/api/auth/terms", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION, accepted: true }),
        });
        window.location.assign(acceptance.ok ? "/onboarding" : "/accept-terms?next=%2Fonboarding");
        return;
      }

      setLoading(false);
      setSuccess(true);
    } catch {
      setError("Não foi possível concluir o cadastro. Tente novamente com uma nova verificação.");
    } finally {
      submitting.current = false;
      setLoading(false);
      captcha.reset();
    }
  };

  return (
    <AuthShell
      eyebrow="Faça parte da comunidade"
      title="Crie sua conta"
      description="Publique projetos, salve referências e acompanhe a evolução da sua garagem."
    >
            {success ? (
              <p className="mt-4 text-sm text-muted">
                Cadastro iniciado. Se a conta precisar de confirmação, você receberá um link por email.
                Se já tiver uma conta, entre ou solicite a recuperação de senha.
              </p>
            ) : (
              <>
                <GoogleSigninButton />

                <div className="my-5 flex items-center gap-3 text-[10px] font-ui font-semibold uppercase tracking-[0.18em] text-muted/80">
                  <span className="h-px flex-1 bg-border/70" />
                  <span>ou continue com email</span>
                  <span className="h-px flex-1 bg-border/70" />
                </div>

                <form action={handleSubmit} onReset={(event) => event.preventDefault()} className="grid gap-4">
                  <label className="grid gap-2 text-sm font-medium text-foreground/85">
                    Nome completo
                    <Input placeholder="Como você quer ser chamado" name="fullName" autoComplete="name" required />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-foreground/85">
                    Email
                    <Input placeholder="voce@email.com" type="email" name="email" autoComplete="email" required />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium text-foreground/85">
                      Senha
                      <Input placeholder="Mínimo de 6 caracteres" type="password" name="password" autoComplete="new-password" required />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-foreground/85">
                      Confirmar senha
                      <Input placeholder="Repita a senha" type="password" name="confirmPassword" autoComplete="new-password" required />
                    </label>
                  </div>
                  <Turnstile onToken={captcha.setToken} generation={captcha.generation} />
                  <TermsCheckbox onChange={(value) => { if (value) { setTermsError(false); if (error === TERMS_REQUIRED_MESSAGE) setError(""); } }} invalid={termsError} />
                  {error ? <p id="terms-error" role="alert" aria-live="polite" className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Cadastrando..." : "Criar conta"}
                  </Button>
                </form>
              </>
            )}
            <p className="mt-5 text-center text-xs text-muted">
              Já tem uma conta? <Link href="/login" className="font-semibold text-foreground hover:text-accent">Entrar</Link>
            </p>
    </AuthShell>
  );
}
