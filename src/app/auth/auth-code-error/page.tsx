import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Falha no login",
};

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-md pt-20 md:pt-24 pb-12">
          <Card className="p-6 md:p-8">
            <p className="text-xs text-muted">Autenticação</p>
            <h1 className="mt-2 font-title text-2xl tracking-tight">
              Não foi possível finalizar o login
            </h1>
            <div className="mt-5 rounded-3xl border border-danger/30 bg-danger/10 p-4">
              <div className="flex items-start gap-3">
                <CircleAlert className="mt-0.5 size-5 text-danger" />
                <div className="min-w-0">
                  <p className="font-ui font-semibold tracking-tight">Erro no callback</p>
                  <p className="mt-1 text-sm text-muted">
                    Tente novamente. Se o erro persistir, verifique o provedor (Google) e as URLs de redirecionamento no Supabase.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-2">
              <Button asChild className="sm:flex-1">
                <Link href="/login">Voltar ao login</Link>
              </Button>
              <Button asChild variant="outline" className="sm:flex-1">
                <Link href="/montar">Continuar sem login</Link>
              </Button>
            </div>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

