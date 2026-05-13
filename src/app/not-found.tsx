import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-background px-6">
      <div className="max-w-lg w-full pg-glass rounded-4xl p-8 md:p-10 text-center">
        <p className="text-sm text-muted">404</p>
        <h1 className="mt-2 font-title text-3xl md:text-4xl tracking-tight">
          Essa rota saiu da pista
        </h1>
        <p className="mt-3 text-muted">
          O link pode estar quebrado ou a página ainda não foi montada.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/">Voltar pra Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/montar">Montar Projeto</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

