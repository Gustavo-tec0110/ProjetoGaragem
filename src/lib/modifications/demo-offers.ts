import "server-only";
import type { CatalogOffersResponse, OfferStore } from "./offers";

export function catalogOfferDemoEnabled() {
  // Even an accidentally retained flag cannot enable fictitious offers in production.
  return process.env.NODE_ENV === "development" && process.env.CATALOG_OFFERS_DEMO === "1";
}

export function demoCatalogOffers(id: string): CatalogOffersResponse {
  const counts: Record<string, number> = {
    "74f41706-15c6-470c-9c55-0b426e72e209": 3, // Aerofólio
    "34105855-16df-4dc9-b0f9-5f154ff368a2": 3, // Turbocompressor
    "4ce33adc-ba38-4548-9a28-f1bf78140bb2": 3, // Volante
    "2eaaa07a-b45e-4238-afe7-c2afed3c67b6": 1, // Coilover
  };
  const stores: OfferStore[] = ["mercado_livre", "shopee", "amazon"];
  return { demonstration: true, offers: stores.slice(0, counts[id] ?? 0).map((store) => ({
    id: `demo-${id}-${store}`, store, destination_url: null, is_affiliate: false,
    price: null, price_checked_at: null, demonstration: true,
  })) };
}
