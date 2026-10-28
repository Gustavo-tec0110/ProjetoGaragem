import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import definitions from "./catalog-definitions.json";
import { publicOffer, validateManagedOffer, type CatalogOffersResponse, type ManagedCatalogOffer } from "./offers";

export function localOffersEnabled() {
  return process.env.NODE_ENV === "development" && process.env.CATALOG_OFFERS_LOCAL === "1";
}

export async function localCatalogOffers(slug: string): Promise<CatalogOffersResponse> {
  const manifest = JSON.parse(await readFile(path.join(process.cwd(), "data/catalog-offers.local.json"), "utf8")) as { version: number; offers: ManagedCatalogOffer[] };
  if (manifest.version !== 1 || !Array.isArray(manifest.offers)) throw new Error("Invalid local offers");
  const slugs = new Set(definitions.map((item) => item.slug));
  return { demonstration: false, offers: manifest.offers.filter((row) => row.catalog_slug === slug).flatMap((row) => {
    const offer = publicOffer(validateManagedOffer(row, slugs));
    return offer ? [offer] : [];
  }).slice(0, 20) };
}
