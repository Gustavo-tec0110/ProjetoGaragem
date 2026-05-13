export type BRLRange = {
  min: number;
  max: number;
  mid: number;
};

function parseCompactNumber(token: string) {
  const cleaned = token.trim().toLowerCase().replace(/\s/g, "");
  if (!cleaned) return null;

  const isK = cleaned.endsWith("k");
  const numeric = isK ? cleaned.slice(0, -1) : cleaned;
  const value = Number(numeric.replace(",", "."));
  if (!Number.isFinite(value)) return null;

  return isK ? value * 1000 : value;
}

export function parseBRLRange(input: string | null | undefined): BRLRange | null {
  if (!input) return null;

  const cleaned = input
    .replace(/R\$\s*/gi, "")
    .replace(/[^\d.,kK–—-]/g, "")
    .trim();

  if (!cleaned) return null;

  const parts = cleaned.split(/[–—-]/).map((p) => p.trim()).filter(Boolean);

  if (parts.length === 0) return null;
  if (parts.length === 1) {
    const value = parseCompactNumber(parts[0]);
    if (value === null) return null;
    return { min: value, max: value, mid: value };
  }

  const min = parseCompactNumber(parts[0]);
  const max = parseCompactNumber(parts[1]);
  if (min === null || max === null) return null;

  const normalizedMin = Math.min(min, max);
  const normalizedMax = Math.max(min, max);
  return { min: normalizedMin, max: normalizedMax, mid: (normalizedMin + normalizedMax) / 2 };
}

export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatBRLCompact(value: number) {
  if (!Number.isFinite(value)) return "—";
  if (value < 1000) return formatBRL(Math.round(value));

  const raw = value / 1000;
  const fixed = raw >= 10 ? raw.toFixed(0) : raw.toFixed(1);
  return `R$ ${fixed.replace(".", ",")}k`;
}

export function formatBRLRange(range: BRLRange) {
  return `${formatBRLCompact(range.min)}–${formatBRLCompact(range.max)}`;
}

