import "server-only";

import sharp from "sharp";

import {
  IMAGE_UPLOAD_MAX_BYTES,
  IMAGE_UPLOAD_MAX_HEIGHT,
  IMAGE_UPLOAD_MAX_PIXELS,
  IMAGE_UPLOAD_MAX_WIDTH,
} from "@/lib/security/limits";

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function validateAndNormalizeImage(file: File) {
  if (file.size < 1 || file.size > IMAGE_UPLOAD_MAX_BYTES) {
    throw new Error("Envie uma imagem de até 5 MB.");
  }
  if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    throw new Error("Envie apenas imagens JPG, PNG ou WebP.");
  }

  const input = Buffer.from(await file.arrayBuffer());
  let image: ReturnType<typeof sharp>;
  try {
    image = sharp(input, {
      animated: false,
      limitInputPixels: IMAGE_UPLOAD_MAX_PIXELS,
      failOn: "error",
    });
    const metadata = await image.metadata();
    if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
      throw new Error("Formato não permitido.");
    }
    if (!metadata.width || !metadata.height || metadata.width > IMAGE_UPLOAD_MAX_WIDTH || metadata.height > IMAGE_UPLOAD_MAX_HEIGHT || metadata.width * metadata.height > IMAGE_UPLOAD_MAX_PIXELS) {
      throw new Error("As dimensões da imagem são grandes demais.");
    }
  } catch (error) {
    if (error instanceof Error && /Formato|dimensões|imagem de até/.test(error.message)) throw error;
    throw new Error("O arquivo não é uma imagem JPG, PNG ou WebP válida.", { cause: error });
  }

  try {
    const normalized = await image
      .rotate()
      .resize({
        width: IMAGE_UPLOAD_MAX_WIDTH,
        height: IMAGE_UPLOAD_MAX_HEIGHT,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    if (normalized.data.byteLength > IMAGE_UPLOAD_MAX_BYTES) {
      throw new Error("A imagem processada excede o limite de 5 MB.");
    }

    return {
      data: normalized.data,
      width: normalized.info.width,
      height: normalized.info.height,
      contentType: "image/webp",
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("excede")) throw error;
    throw new Error("Não foi possível processar esta imagem com segurança.", { cause: error });
  }
}
