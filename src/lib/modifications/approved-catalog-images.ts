import selected from "./approved-catalog-images.json";
import previous from "./catalog-assets.json";
import { resolveCatalogImage } from "./catalog-assets";

const approved: Record<string, { category: string; image: string }> = selected;
const oldDefaults: Record<string, { image: string | null; previousPaths: string[] }> = previous;

export function getApprovedCatalogAssetPath(categorySlug: string, slug: string) {
  const asset = approved[slug];
  return asset?.category === categorySlug ? asset.image : null;
}

export function resolveApprovedCatalogImage(categorySlug: string, slug: string, databasePath: string | null) {
  const selectedImage = getApprovedCatalogAssetPath(categorySlug, slug);
  const old = oldDefaults[slug];
  // Retain independently curated database images; only known shipped defaults are superseded.
  if (selectedImage && (!databasePath || databasePath === selectedImage || old?.image === databasePath || old?.previousPaths.includes(databasePath))) return selectedImage;
  return resolveCatalogImage(categorySlug, slug, databasePath);
}
