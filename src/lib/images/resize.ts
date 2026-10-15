import "server-only";
import sharp from "sharp";

import { IMAGE_UPLOAD_MAX_PIXELS } from "@/lib/security/limits";

const WIDTHS = new Set([32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840]);

export function imageResizeOptions(search: URLSearchParams) {
  const keys = Array.from(search.keys());
  if (!keys.length) return null;
  if (keys.some((key) => key !== "w" && key !== "q") || search.getAll("w").length !== 1 || search.getAll("q").length > 1) {
    throw new Error("Invalid image parameters");
  }
  const width = Number(search.get("w"));
  const quality = Number(search.get("q") ?? 75);
  if (!WIDTHS.has(width) || (quality !== 75 && quality !== 85)) throw new Error("Invalid image size");
  return { width, quality };
}

/** Responsive variants keep the existing thumbnail bandwidth optimization;
 * every variant passes the same live authorization and no-store response. */
export async function resizeProjectImage(blob: Blob, options: { width: number; quality: number }) {
  const bytes = await sharp(Buffer.from(await blob.arrayBuffer()), { limitInputPixels: IMAGE_UPLOAD_MAX_PIXELS, animated: false })
    .rotate().resize({ width: options.width, withoutEnlargement: true })
    .webp({ quality: options.quality }).toBuffer();
  return new Blob([new Uint8Array(bytes)], { type: "image/webp" });
}
