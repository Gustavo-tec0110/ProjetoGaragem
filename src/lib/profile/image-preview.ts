import { IMAGE_UPLOAD_MAX_BYTES, IMAGE_UPLOAD_MAX_PIXELS } from "@/lib/security/limits";

type ImageHeader = { width: number; height: number; orientation: number };

/** Read dimensions before asking the browser to allocate an image bitmap. */
export function profileImageHeader(bytes: Uint8Array): ImageHeader {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (offset: number, length: number) => String.fromCharCode(...bytes.subarray(offset, offset + length));
  let width = 0, height = 0, orientation = 1;
  const exif = (tiff: number, end: number) => {
    if (tiff + 8 > end) return;
    const little = ascii(tiff, 2) === "II";
    if ((!little && ascii(tiff, 2) !== "MM") || view.getUint16(tiff + 2, little) !== 42) return;
    const directory = tiff + view.getUint32(tiff + 4, little);
    if (directory < tiff + 8 || directory + 2 > end) return;
    const count = view.getUint16(directory, little);
    for (let i = 0; i < count; i++) {
      const entry = directory + 2 + i * 12;
      if (entry + 12 > end) break;
      if (view.getUint16(entry, little) === 0x112 && view.getUint16(entry + 2, little) === 3 && view.getUint32(entry + 4, little) === 1) {
        const value = view.getUint16(entry + 8, little);
        if (value >= 1 && value <= 8) orientation = value;
      }
    }
  };
  const dimensions = (w: number, h: number) => {
    if (!w || !h) throw new Error("Imagem inválida.");
    if (w * h > IMAGE_UPLOAD_MAX_PIXELS) throw new Error("Escolha uma imagem de até 16 megapixels.");
    if (width && (width !== w || height !== h)) throw new Error("Dimensões de imagem inconsistentes.");
    width = w; height = h;
  };
  if (bytes.length >= 24 && ascii(0, 8) === "\x89PNG\r\n\x1a\n" && ascii(12, 4) === "IHDR") {
    dimensions(view.getUint32(16), view.getUint32(20));
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const size = view.getUint32(offset), end = offset + 12 + size;
      if (end > bytes.length) throw new Error("PNG incompleto.");
      if (ascii(offset + 4, 4) === "eXIf") exif(offset + 8, end - 4);
      offset = end;
    }
  } else if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") {
    const end = Math.min(bytes.length, view.getUint32(4, true) + 8);
    for (let offset = 12; offset + 8 <= end;) {
      const kind = ascii(offset, 4), size = view.getUint32(offset + 4, true), data = offset + 8;
      if (data + size > end) throw new Error("Imagem incompleta.");
      if (kind === "VP8X" && size >= 10) {
        dimensions(1 + bytes[data + 4] + (bytes[data + 5] << 8) + (bytes[data + 6] << 16),
          1 + bytes[data + 7] + (bytes[data + 8] << 8) + (bytes[data + 9] << 16));
      } else if (kind === "VP8 " && size >= 10 && ascii(data + 3, 3) === "\x9d\x01\x2a") {
        dimensions(view.getUint16(data + 6, true) & 0x3fff, view.getUint16(data + 8, true) & 0x3fff);
      } else if (kind === "VP8L" && size >= 5 && bytes[data] === 0x2f) {
        dimensions(1 + bytes[data + 1] + ((bytes[data + 2] & 0x3f) << 8),
          1 + (bytes[data + 2] >> 6) + (bytes[data + 3] << 2) + ((bytes[data + 4] & 15) << 10));
      }
      if (kind === "EXIF") exif(data + (ascii(data, 6) === "Exif\0\0" ? 6 : 0), data + size);
      offset = data + size + (size & 1);
    }
  } else if (bytes.length >= 4 && view.getUint16(0) === 0xffd8) {
    for (let offset = 2; offset + 4 <= bytes.length;) {
      if (bytes[offset++] !== 0xff) throw new Error("JPEG inválido.");
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
      if (offset + 2 > bytes.length) break;
      const size = view.getUint16(offset), data = offset + 2, end = offset + size;
      if (size < 2 || end > bytes.length) throw new Error("JPEG incompleto.");
      if (marker === 0xe1 && size >= 16 && ascii(data, 6) === "Exif\0\0") {
        exif(data + 6, end);
      }
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker) && size >= 8) {
        dimensions(view.getUint16(data + 3), view.getUint16(data + 1));
        // EXIF precedes SOF in conventional files; continue parsing to accept it later too.
      }
      offset = end;
    }
  }
  if (!width || !height) throw new Error("Não foi possível ler esta imagem. Escolha outro arquivo.");
  if (width * height > IMAGE_UPLOAD_MAX_PIXELS) throw new Error("Escolha uma imagem de até 16 megapixels.");
  return orientation >= 5 ? { width: height, height: width, orientation } : { width, height, orientation };
}

// Reduced previews were measured and rejected on the modest CPU: resizing
// delayed selection substantially. Keep the approved native decoder and Blob URL.
export async function prepareProfileImagePreview(file: File) {
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) throw new Error("Escolha uma imagem de até 5 MB.");
  profileImageHeader(new Uint8Array(await file.arrayBuffer()));
  const originalUrl = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = originalUrl;
    await image.decode();
    return { originalUrl, previewUrl: originalUrl,
      width: image.naturalWidth, height: image.naturalHeight,
      dispose: () => URL.revokeObjectURL(originalUrl) };
  } catch (error) {
    URL.revokeObjectURL(originalUrl);
    throw error;
  }
}
