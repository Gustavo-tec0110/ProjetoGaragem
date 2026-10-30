"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { loadPrivateInspirationPlanner } from "@/app/garagem/planner-actions";

const InspirationPlanner = dynamic(() => import("./inspiration-planner").then((module) => module.InspirationPlanner), {
  loading: () => <p role="status" className="text-sm text-muted">Carregando planejador…</p>,
});

export function LazyInspirationPlanner() {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadPrivateInspirationPlanner>> | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function load() {
    if (data || pending) return;
    setError("");
    startTransition(async () => {
      try { setData(await loadPrivateInspirationPlanner()); }
      catch { setError("Não foi possível carregar o planejador. Tente novamente."); }
    });
  }
  return <details onToggle={(event) => { if (event.currentTarget.open) load(); }} className="mt-8 rounded-2xl border border-border/70 bg-background/25 p-4 open:bg-card/35 sm:p-5">
    <summary className="cursor-pointer list-none font-ui text-sm font-semibold text-foreground marker:hidden">
      Ferramenta privada: similaridade com inspiração
      <span className="ml-2 text-xs font-normal text-muted">Abrir planejador</span>
    </summary>
    <div className="mt-5">
      {pending ? <p role="status" className="text-sm text-muted">Carregando planejador…</p> : null}
      {error ? <div role="status" className="text-sm text-muted"><p>{error}</p><button type="button" onClick={load} className="mt-2 min-h-11 font-semibold underline">Tentar novamente</button></div> : null}
      {data ? <InspirationPlanner mode="supabase" storageScope={data.storageScope} currentProjects={data.myProjects} inspirationProjects={data.referenceProjects} referenceSourceLabel={data.referenceSourceLabel} /> : null}
    </div>
  </details>;
}
