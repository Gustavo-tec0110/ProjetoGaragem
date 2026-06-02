export const CAR_CATEGORIES = [
  "JDM",
  "Euro",
  "Nacional",
  "Turbo",
  "Aspirado",
  "Stance",
  "Track",
  "Drift",
  "Off-road",
  "Som automotivo",
  "Sleeper",
  "OEM+",
  "Projeto economico",
  "Projeto premium",
] as const;

export const PART_CATEGORIES = [
  "Motor",
  "Turbo",
  "Alimentacao",
  "Escape",
  "Suspensao",
  "Rodas",
  "Pneus",
  "Freios",
  "Interior",
  "Exterior",
  "Som",
  "Eletronica",
  "Cambio",
  "Arrefecimento",
  "Seguranca",
  "Outros",
] as const;

export function normalizeSlug(input: string) {
  const normalized = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || "projeto";
}
