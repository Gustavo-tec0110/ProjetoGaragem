export default function Loading() {
  return (
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="pg-glass rounded-3xl px-6 py-5 flex items-center gap-4">
        <div className="relative size-10">
          <div className="absolute inset-0 rounded-full border-2 border-border/70" />
          <div className="absolute inset-0 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <div className="absolute inset-2 rounded-full bg-accent/10 shadow-glow" />
        </div>
        <div className="flex flex-col">
          <span className="font-title tracking-tight text-foreground">
            Carregando garagem…
          </span>
          <span className="text-sm text-muted">Preparando a interface premium</span>
        </div>
      </div>
    </div>
  );
}

