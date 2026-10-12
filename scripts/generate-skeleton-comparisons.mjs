import { Buffer } from "node:buffer";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve("docs/skeleton-audit");
const screenshots = path.join(root, "screenshots");
const comparisons = path.join(root, "comparisons");
const names = ["explorar", "rankings", "comparar", "atualizacoes", "garagem", "notificacoes", "criar-projeto", "formulario-perfil"];
const widths = [360, 390, 768, 1024, 1440, 1920];

await mkdir(comparisons, { recursive: true });

for (const name of names) {
  for (const width of widths) {
    const real = path.join(screenshots, `${name}-${width}-real.png`);
    const skeleton = path.join(screenshots, `${name}-${width}-skeleton.png`);
    const [realMeta, skeletonMeta] = await Promise.all([sharp(real).metadata(), sharp(skeleton).metadata()]);
    const height = Math.max(realMeta.height, skeletonMeta.height);
    const gap = 24;
    const labelHeight = 44;
    const labels = Buffer.from(`<svg width="${width * 2 + gap}" height="${labelHeight}"><rect width="100%" height="100%" fill="#101116"/><text x="16" y="29" fill="#fff" font-size="18" font-family="sans-serif">Página real</text><text x="${width + gap + 16}" y="29" fill="#fff" font-size="18" font-family="sans-serif">Skeleton</text></svg>`);

    await sharp({ create: { width: width * 2 + gap, height: height + labelHeight, channels: 4, background: "#08090b" } })
      .composite([
        { input: labels, left: 0, top: 0 },
        { input: real, left: 0, top: labelHeight },
        { input: skeleton, left: width + gap, top: labelHeight },
      ])
      .png()
      .toFile(path.join(comparisons, `${name}-${width}-comparison.png`));
  }
}
