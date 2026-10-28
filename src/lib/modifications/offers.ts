// Shared validation for persisted offers and their external links. No outbound requests.
export const offerStores = {
  mercado_livre: { name: "Mercado Livre", monogram: "ML", hosts: ["mercadolivre.com.br", "mercadolivre.com", "meli.la"] },
  shopee: { name: "Shopee", monogram: "S", hosts: ["shopee.com.br", "shope.ee"] },
  magalu: { name: "Magazine Luiza", monogram: "M", hosts: ["magazineluiza.com.br", "magazinevoce.com.br", "magazineluiza.onelink.me"] },
  amazon: { name: "Amazon", monogram: "a", hosts: ["amazon.com.br", "amzn.to"] },
} as const;

export type OfferStore = keyof typeof offerStores;
export type CatalogOfferRow = {
  id: string;
  catalog_id: string;
  store: OfferStore;
  destination_url: string;
  is_active: boolean;
  is_affiliate: boolean;
  price: number | null;
  price_checked_at: string | null;
  created_at: string;
  updated_at: string;
  product_name: string | null;
  product_url: string | null;
  compatibility_notes: string | null;
  verified_at: string | null;
  source: "manual" | "official_api";
  source_product_id: string | null;
};
export type CatalogOffer = {
  id: string;
  store: OfferStore;
  destination_url: string | null;
  is_affiliate: boolean;
  price: number | null;
  price_checked_at: string | null;
  demonstration: boolean;
  product_name?: string;
  compatibility_notes?: string;
};
export type CatalogOffersResponse = { offers: CatalogOffer[]; demonstration: boolean; unavailable?: boolean };

export function safeOfferUrl(store: OfferStore, value: unknown): string | null {
  if (!Object.hasOwn(offerStores, store) || typeof value !== "string" || value.length > 2048 || /[\s\\]/u.test(value) || [...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (!offerStores[store].hosts.some((host) => url.hostname === host || (host !== "magazineluiza.onelink.me" && url.hostname.endsWith(`.${host}`)))) return null;
    return url.href;
  } catch { return null; }
}

// A price is useful only when its source was checked recently. Never infer it from catalog estimates.
export function freshOfferPrice(price: unknown, checkedAt: unknown, now = Date.now()): number | null {
  const checked = typeof checkedAt === "string" ? Date.parse(checkedAt) : NaN;
  return typeof price === "number" && Number.isFinite(price) && price > 0 && Number.isFinite(checked)
    && checked <= now && now - checked <= 24 * 60 * 60 * 1000 ? price : null;
}

export function publicOffer(row: Omit<CatalogOfferRow, "catalog_id">): CatalogOffer | null {
  const url = safeOfferUrl(row.store, row.destination_url);
  if (!row.is_active || !url || !offerReviewed(row)) return null;
  const price = freshOfferPrice(row.price, row.price_checked_at);
  return { id: row.id, store: row.store, destination_url: url, is_affiliate: row.is_affiliate,
    price, price_checked_at: price === null ? null : row.price_checked_at, demonstration: false,
    product_name: row.product_name!, compatibility_notes: row.compatibility_notes! };
}

// Domain validation is not proof of availability or compatibility. A human must review the exact listing.
export function offerReviewed(row: Pick<CatalogOfferRow, "store" | "product_url" | "product_name" | "compatibility_notes" | "verified_at">, now = Date.now()) {
  const checked = typeof row.verified_at === "string" ? Date.parse(row.verified_at) : NaN;
  return Boolean(safeOfferUrl(row.store, row.product_url) && row.product_name?.trim()
    && row.compatibility_notes?.trim() && Number.isFinite(checked) && checked <= now);
}

export type ManagedCatalogOffer = Omit<CatalogOfferRow, "catalog_id"> & { catalog_slug: string };
export type OfferDraft = Omit<ManagedCatalogOffer, "id" | "created_at" | "updated_at" | "verified_at" | "is_active"> & { id?: string };

// Future official API adapters return drafts through this boundary; review/activation remains explicit.
export interface OfficialOfferProvider {
  store: OfferStore;
  fetchDrafts(catalogSlug: string, signal?: AbortSignal): Promise<OfferDraft[]>;
}

export function validateManagedOffer(row: ManagedCatalogOffer, slugs: ReadonlySet<string>) {
  if (!slugs.has(row.catalog_slug)) throw new Error("Componente não encontrado no catálogo aprovado.");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id)) throw new Error("ID de oferta inválido.");
  if (!safeOfferUrl(row.store, row.destination_url) || !safeOfferUrl(row.store, row.product_url)) throw new Error("Use URLs HTTPS da loja selecionada, sem credenciais ou redirecionadores externos.");
  for (const [label, value, max] of [["Produto", row.product_name, 180], ["Aplicação conferida", row.compatibility_notes, 1000]] as const) {
    if (typeof value !== "string" || value.trim().length < 2 || value.length > max) throw new Error(`${label}: preenchimento obrigatório (até ${max} caracteres).`);
  }
  if (typeof row.is_active !== "boolean" || typeof row.is_affiliate !== "boolean") throw new Error("Ativação e afiliação devem ser booleanos.");
  if (!["manual", "official_api"].includes(row.source)) throw new Error("Origem inválida.");
  if (row.source_product_id !== null && (typeof row.source_product_id !== "string" || row.source_product_id.length > 180)) throw new Error("Identificador de produto inválido.");
  if ((row.price === null) !== (row.price_checked_at === null)) throw new Error("Preço e data da consulta devem ser informados juntos.");
  if (row.price !== null && (typeof row.price !== "number" || !Number.isFinite(row.price) || row.price <= 0 || row.price >= 1e10 || Math.round(row.price * 100) / 100 !== row.price)) throw new Error("Preço deve ser positivo, em BRL, com até duas casas decimais.");
  if (row.price_checked_at !== null && (typeof row.price_checked_at !== "string" || !Number.isFinite(Date.parse(row.price_checked_at)) || Date.parse(row.price_checked_at) > Date.now())) throw new Error("Data de consulta do preço inválida ou futura.");
  if (row.verified_at !== null && (typeof row.verified_at !== "string" || !Number.isFinite(Date.parse(row.verified_at)) || Date.parse(row.verified_at) > Date.now())) throw new Error("Data de revisão inválida ou futura.");
  if (row.is_active && !offerReviewed(row)) throw new Error("Revise o anúncio e a aplicação antes de ativar a oferta.");
  return row;
}
