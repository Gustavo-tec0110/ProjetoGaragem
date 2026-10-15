import { AuthShell } from "@/components/auth/auth-shell";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Bem-vindo de volta"
      title="Entre no Projeto Garagem"
      description="Acesse seus projetos, referências salvas e as novidades da comunidade."
    >
      <LoginForm />
    </AuthShell>
  );
}
