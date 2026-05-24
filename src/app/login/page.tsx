import Link from "next/link";

import { GoogleSigninButton } from "@/components/auth/google-signin-button";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-md pt-20 md:pt-24 pb-12">
          <Card className="p-6 md:p-8">
            <h1 className="font-title text-2xl tracking-tight">
              Entrar no ProjetoGaragem
            </h1>
            <p className="mt-2 text-sm text-muted">
              Login Google (Supabase) + perfil + builds salvas.
            </p>

            <div className="mt-6">
              <GoogleSigninButton />
            </div>

            <div className="mt-6 grid gap-3">
              <Input placeholder="Email" type="email" />
              <Input placeholder="Senha" type="password" />
            </div>

            <p className="mt-3 text-xs text-muted">
              Login por email/senha em breve — por enquanto, use Google.
            </p>

            <div className="mt-5 flex flex-col gap-3">
              <Button disabled>Entrar</Button>
              <Button variant="outline" asChild>
                <Link href="/montar">Continuar sem login</Link>
              </Button>
            </div>

            <p className="mt-6 text-xs text-muted">
              Ao continuar, você concorda com os termos e aceita salvar builds no seu
              perfil quando estiver conectado.
            </p>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

