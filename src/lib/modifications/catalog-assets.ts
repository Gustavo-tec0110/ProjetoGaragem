import assets from "./catalog-assets.json";

const reviewedAssets: Record<string, { category: string; image: string | null; previousPaths: string[] }> = assets;

/** Only photographs that passed the editorial and license review are used as defaults. */
export function getCatalogAssetPath(categorySlug: string, catalogSlug: string) {
  const item = reviewedAssets[catalogSlug];
  return item?.category === categorySlug ? item.image : null;
}

export function resolveCatalogImage(categorySlug: string, catalogSlug: string, databasePath: string | null) {
  const item = reviewedAssets[catalogSlug];
  if (!item || item.category !== categorySlug) return databasePath;
  if (databasePath && !item.previousPaths.includes(databasePath)) return databasePath;
  return item.image;
}
