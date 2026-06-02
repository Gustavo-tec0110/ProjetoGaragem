import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-background px-6">
      <div className="max-w-lg w-full pg-glass rounded-4xl p-8 text-center md:p-10">
        <p className="text-sm text-muted">404</p>
        <h1 className="mt-2 font-title text-3xl tracking-tight md:text-4xl">
          Essa rota saiu da pista
        </h1>
        <p className="mt-3 text-muted">
          O link pode estar quebrado ou a pagina ainda nao foi montada.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/explorar">Voltar para explorar</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/carros/novo">Adicionar projeto</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
