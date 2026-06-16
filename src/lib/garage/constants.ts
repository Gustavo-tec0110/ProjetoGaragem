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
  "Projeto econômico",
  "Projeto premium",
] as const;

export const CAR_BRANDS = [
  "Volkswagen",
  "Chevrolet",
  "Fiat",
  "Ford",
  "Honda",
  "Toyota",
  "Nissan",
  "Renault",
  "Peugeot",
  "Citroën",
  "Hyundai",
  "Mitsubishi",
  "Audi",
  "BMW",
  "Mercedes-Benz",
] as const;

export const PART_CATEGORIES = [
  "Motor",
  "Turbo",
  "Alimentação",
  "Escape",
  "Suspensão",
  "Rodas e pneus",
  "Rodas",
  "Pneus",
  "Freios",
  "Interior",
  "Visual",
  "Exterior",
  "Som",
  "Elétrica",
  "Eletrônica",
  "Câmbio",
  "Arrefecimento",
  "Segurança",
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
