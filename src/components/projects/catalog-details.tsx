"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, Info, LoaderCircle, Wrench, X } from "lucide-react";
import { ProjectImage } from "@/components/projects/project-image";
import { Button } from "@/components/ui/button";
import type { ModificationCatalogItem } from "@/lib/modifications/types";
import { freshOfferPrice, offerStores, safeOfferUrl, type CatalogOffersResponse } from "@/lib/modifications/offers";

// Reuse concurrent reads (including development Strict Mode mounts), without retaining stale prices.
const pendingOffers = new Map<string, Promise<CatalogOffersResponse>>();
function loadOffers(id: string, slug: string) {
  // Fictitious cards belong exclusively to explicitly requested test-harness previews.
  const preview = window.location.pathname.startsWith("/test-harness/");
  const key = `${id}:${slug}:${preview}`;
  const pending = pendingOffers.get(key);
  if (pending) return pending;
  const request = fetch(`/api/catalog/${encodeURIComponent(id)}/offers?slug=${encodeURIComponent(slug)}${preview ? "&demonstration=1" : ""}`, { cache: "no-store" }).then(async (response) => {
    if (!response.ok) throw new Error("offers-unavailable");
    return await response.json() as CatalogOffersResponse;
  });
  pendingOffers.set(key, request);
  request.then(() => pendingOffers.delete(key), () => pendingOffers.delete(key));
  return request;
}

function WhereToBuy({ catalogId, slug }: { catalogId: string; slug: string }) {
  const [result, setResult] = React.useState<CatalogOffersResponse | null>(null);
  const [error, setError] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const [demoNotice, setDemoNotice] = React.useState("");
  React.useEffect(() => {
    let current = true;
    loadOffers(catalogId, slug).then((data) => { if (current) setResult(data); })
      .catch(() => { if (current) setError(true); });
    return () => { current = false; };
  }, [catalogId, slug, attempt]);

  return <section aria-label="Onde comprar" className="mt-6 border-t border-border pt-5">
    <h3 className="font-title text-lg font-semibold">Onde comprar</h3>
    <p className="mt-1 text-sm leading-relaxed text-muted">Confira opções disponíveis em lojas parceiras.</p>
    {result?.demonstration ? <div className="mt-4 flex gap-2 rounded-xl bg-surface px-3 py-3 text-xs leading-relaxed text-muted">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p><strong className="font-semibold text-foreground">DEMONSTRAÇÃO</strong> · Opções fictícias para avaliação local. Os botões exibem um aviso e nenhuma compra é iniciada.</p>
    </div> : null}
    {!result && !error ? <p role="status" className="mt-4 flex items-center gap-2 text-sm text-muted"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Carregando opções…</p> : null}
    {error || result?.unavailable ? <div className="mt-4 text-sm text-muted">
      <p role="status">Não foi possível consultar as opções de compra agora.</p>
      <button type="button" onClick={() => { setError(false); setResult(null); setAttempt((value) => value + 1); }} className="mt-2 min-h-11 font-semibold text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-accent">Tentar novamente</button>
    </div> : null}
    {result && !result.unavailable && !result.offers.length ? <p className="mt-4 rounded-xl bg-surface p-4 text-sm leading-relaxed text-muted">Opções de compra ainda não disponíveis para este componente.</p> : null}
    <div className="mt-4 space-y-2">
      {result?.offers.map((offer) => {
        if (!Object.hasOwn(offerStores, offer.store)) return null;
        const store = offerStores[offer.store];
        const url = safeOfferUrl(offer.store, offer.destination_url);
        if (!offer.demonstration && !url) return null;
        const price = freshOfferPrice(offer.price, offer.price_checked_at);
        return <div key={offer.id} className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border border-border/80 p-3">
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground/5 font-ui text-xs font-bold text-muted">{store.monogram}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{store.name}</p>
            {offer.product_name ? <p className="mt-1 break-words text-xs leading-relaxed text-foreground/85">{offer.product_name}</p> : null}
            {offer.compatibility_notes ? <p className="mt-1 break-words text-xs leading-relaxed text-muted">Aplicação: {offer.compatibility_notes}</p> : null}
            {offer.demonstration ? <p className="mt-0.5 text-[10px] font-semibold tracking-wide text-muted">DEMONSTRAÇÃO</p> : offer.is_affiliate ? <p className="mt-0.5 text-xs text-muted">Link de afiliado</p> : null}
            {price !== null && !offer.demonstration ? <p className="mt-1 text-sm">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price)}<span className="mt-0.5 block text-[10px] text-muted">Verificado em {new Date(offer.price_checked_at!).toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" })}</span></p> : null}
          </div>
          {offer.demonstration ? <Button variant="outline" size="sm" className="h-11 shrink-0 px-3 text-xs" aria-label={`Ver na loja ${store.name} — demonstração`} onClick={() => setDemoNotice(`Demonstração: ${store.name}. Nenhuma loja foi aberta e nenhuma compra foi iniciada.`)}>Ver na loja <ArrowUpRight className="size-3.5" aria-hidden="true" /></Button>
            : <Button asChild variant="outline" size="sm" className="h-11 shrink-0 px-3 text-xs"><a href={url!} target="_blank" rel={`noopener noreferrer${offer.is_affiliate ? " sponsored" : ""}`} aria-label={`Ver na loja ${store.name} (abre em nova aba)`}>Ver na loja <ArrowUpRight className="size-3.5" aria-hidden="true" /></a></Button>}
        </div>;
      })}
    </div>
    <p role="status" aria-live="polite" className={demoNotice ? "mt-3 rounded-xl bg-accent/10 p-3 text-xs leading-relaxed" : "sr-only"}>{demoNotice}</p>
    {result?.offers.some((offer) => offer.is_affiliate && !offer.demonstration) ? <p className="mt-4 text-xs leading-relaxed text-muted">O PG pode receber uma comissão pelos links de afiliado. A venda é realizada pela loja. Confirme preço, disponibilidade e compatibilidade no anúncio.</p> : null}
  </section>;
}

export function CatalogDetails({ item, children }: { item: ModificationCatalogItem; children: React.ReactElement }) {
  return <Dialog.Root>
    <Dialog.Trigger asChild>{children}</Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay data-testid="catalog-details-overlay" className="fixed inset-0 z-[95] bg-black/75" />
      <Dialog.Content className="fixed inset-x-0 bottom-0 z-[96] flex max-h-[94dvh] min-w-0 flex-col overflow-hidden rounded-t-3xl border border-border bg-card text-foreground shadow-elevated outline-none sm:inset-x-6 sm:bottom-auto sm:top-1/2 sm:mx-auto sm:max-h-[90dvh] sm:max-w-[1000px] sm:-translate-y-1/2 sm:rounded-3xl" aria-describedby={undefined}>
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-7 sm:py-5">
          <div className="min-w-0 self-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">Catálogo PG · {item.category.name}</p>
            <Dialog.Title className="mt-1 break-words font-title text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{item.name}</Dialog.Title>
          </div>
          <Dialog.Close asChild><Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Fechar detalhes"><X className="size-5" aria-hidden="true" /></Button></Dialog.Close>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-7 sm:pt-6">
          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-8">
            <div className="min-w-0">
              <div className="relative h-52 overflow-hidden rounded-2xl bg-white sm:h-64 lg:aspect-square lg:h-auto">
                {item.default_image_path ? <ProjectImage src={item.default_image_path} alt={item.name} fill loading="eager" sizes="(min-width: 1024px) 440px, (min-width: 640px) 600px, 350px" fallbackSrc="/modifications/photo-unavailable.svg" className="object-contain p-4" /> : <div className="grid h-full place-items-center"><Wrench className="size-12 text-neutral-400" aria-hidden="true" /></div>}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">Imagem ilustrativa do catálogo. Confira o modelo e a aplicação na loja.</p>
            </div>
            <div className="min-w-0">
              <h3 className="font-title text-base font-semibold">Sobre o componente</h3>
              {item.short_description ? <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-foreground/85">{item.short_description}</p> : <p className="mt-2 text-sm text-muted">Informações detalhadas ainda não disponíveis para este componente.</p>}
              {item.compatibility_notes ? <div className="mt-4"><h3 className="text-xs font-semibold text-foreground">Aplicação e instalação</h3><p className="mt-1 break-words text-xs leading-relaxed text-muted">{item.compatibility_notes}</p></div> : null}
              <WhereToBuy catalogId={item.id} slug={item.slug} />
            </div>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
