"use client";

import { CatalogDetails } from "@/components/projects/catalog-details";
import type { ModificationCatalogItem } from "@/lib/modifications/types";

const shapes = [
  { label: "horizontal", path: "/modifications/audio/20442f73b71426a7a09150b318363559f3cfe356c23f69596a0bfb5144fe4478.webp" },
  { label: "vertical", path: "/modifications/electrical/c03878d07ff345abbf3eebf68fbf52504c4bd240f1c416a60d66b8388bb24269.webp" },
  { label: "ausente", path: null },
];

export function StressCases({ item }: { item: ModificationCatalogItem }) {
  return shapes.map(({ label, path }) => <CatalogDetails key={label} item={{ ...item, default_image_path: path }}>
    <button type="button" className="block rounded-xl border border-border px-4 py-3">Abrir fixture {label}</button>
  </CatalogDetails>);
}
