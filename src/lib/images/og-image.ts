import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { projectImagePathFromUrl } from "./project-image-url";

/** Only an object key reaches Storage. No user-controlled URL reaches a fetch or renderer. */
export async function ogHeroImage(value: string | null, dependencies: {
  authorize: (key: string) => Promise<boolean>;
  download: (key: string) => Promise<Blob | null>;
}) {
  const key = value ? projectImagePathFromUrl(value) : null;
  if (key && await dependencies.authorize(key)) {
    try {
      const blob = await dependencies.download(key);
      if (blob && blob.size <= 5 * 1024 * 1024 && ["image/jpeg", "image/png", "image/webp"].includes(blob.type)) {
        const image = await sharp(Buffer.from(await blob.arrayBuffer()), { limitInputPixels: 16_000_000 })
          .resize(1040, 1040, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
        if (await dependencies.authorize(key)) return { src: `data:image/png;base64,${image.toString("base64")}`, key };
      }
    } catch { /* A missing/invalid object gets the same safe visual fallback. */ }
  }
  const fallback = await readFile(path.join(process.cwd(), "public/ref/hero-car.jpg"));
  return { src: `data:image/jpeg;base64,${fallback.toString("base64")}`, key: null };
}
