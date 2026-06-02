import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ProjectNotFound() {
  return (
    <Card className="mx-auto w-full max-w-2xl p-6 text-center md:p-8">
      <p className="text-xs text-muted">Projeto nao encontrado</p>
      <h1 className="mt-2 font-title text-3xl tracking-tight">
        Essa ficha nao esta mais na pista
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm text-muted">
        O projeto pode ter sido removido, nunca existiu ou estar salvo apenas em outro navegador.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href="/explorar">Voltar para explorar</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/carros/novo">Adicionar um projeto</Link>
        </Button>
      </div>
    </Card>
  );
}
