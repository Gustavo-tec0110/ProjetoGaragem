export type CarCatalogVersion = {
  id: string;
  brand: string;
  model: string;
  generationName: string | null;
  version: string;
  yearStart: number;
  yearEnd: number;
  engineOriginal: string | null;
  inductionOriginal: string | null;
  powerHp: number | null;
  drivetrain: string | null;
  transmission: string | null;
  fuelType: string | null;
  notes: string | null;
  isEstimated: boolean;
};

export type DetailAnswer = "yes" | "no" | "unknown";
export type DataConfidence = "confirmed" | "estimated" | "unknown";

export const UNKNOWN_VERSION_VALUE = "__unknown__";

export const DETAIL_ANSWER_OPTIONS: Array<{ value: DetailAnswer; label: string }> = [
  { value: "yes", label: "Sim" },
  { value: "no", label: "Não" },
  { value: "unknown", label: "Não sei" },
];

export const INDUCTION_OPTIONS = [
  "Carburador",
  "Injeção original",
  "Injeção programável",
  "FuelTech",
  "Outra",
];

export const FALLBACK_CAR_CATALOG: CarCatalogVersion[] = [
  {
    id: "fallback-vw-gol-cl-1991-1994",
    brand: "Volkswagen",
    model: "Gol",
    generationName: "Quadrado",
    version: "CL",
    yearStart: 1991,
    yearEnd: 1994,
    engineOriginal: "AP 1.6 ou AP 1.8 dependendo da configuração",
    inductionOriginal: "Carburador",
    powerHp: 86,
    drivetrain: "Dianteira",
    transmission: "Manual",
    fuelType: "Gasolina/álcool",
    notes: "Referência aproximada; motorização pode variar por ano e mercado.",
    isEstimated: true,
  },
  {
    id: "fallback-vw-gol-gl-1991-1994",
    brand: "Volkswagen",
    model: "Gol",
    generationName: "Quadrado",
    version: "GL",
    yearStart: 1991,
    yearEnd: 1994,
    engineOriginal: "AP 1.8",
    inductionOriginal: "Carburador",
    powerHp: 95,
    drivetrain: "Dianteira",
    transmission: "Manual",
    fuelType: "Gasolina/álcool",
    notes: "Referência aproximada; conferir documento e plaqueta do veículo.",
    isEstimated: true,
  },
  {
    id: "fallback-vw-gol-gts-1987-1994",
    brand: "Volkswagen",
    model: "Gol",
    generationName: "Quadrado",
    version: "GTS",
    yearStart: 1987,
    yearEnd: 1994,
    engineOriginal: "AP 1.8",
    inductionOriginal: "Carburador",
    powerHp: 99,
    drivetrain: "Dianteira",
    transmission: "Manual",
    fuelType: "Gasolina/álcool",
    notes: "Dados aproximados para Gol GTS de fim de série.",
    isEstimated: true,
  },
  {
    id: "fallback-vw-gol-gti-1989-1994",
    brand: "Volkswagen",
    model: "Gol",
    generationName: "Quadrado",
    version: "GTI",
    yearStart: 1989,
    yearEnd: 1994,
    engineOriginal: "AP 2.0",
    inductionOriginal: "Injeção eletrônica",
    powerHp: 120,
    drivetrain: "Dianteira",
    transmission: "Manual",
    fuelType: "Gasolina",
    notes: "Dados aproximados; conferir ano/modelo exato.",
    isEstimated: true,
  },
  {
    id: "fallback-fiat-uno-mille-1990-1996",
    brand: "Fiat",
    model: "Uno",
    generationName: "Primeira geração",
    version: "Mille",
    yearStart: 1990,
    yearEnd: 1996,
    engineOriginal: "Fiasa 1.0",
    inductionOriginal: "Carburador",
    powerHp: 48,
    drivetrain: "Dianteira",
    transmission: "Manual",
    fuelType: "Gasolina/álcool",
    notes: "Dados aproximados de Uno Mille inicial.",
    isEstimated: true,
  },
  {
    id: "fallback-fiat-uno-cs-1984-1994",
    brand: "Fiat",
    model: "Uno",
    generationName: "Primeira geração",
    version: "CS",
    yearStart: 1984,
    yearEnd: 1994,
    engineOriginal: "Fiasa 1.3 ou 1.5 dependendo do ano",
    inductionOriginal: "Carburador",
    powerHp: 71,
    drivetrain: "Dianteira",
    transmission: "Manual",
    fuelType: "Gasolina/álcool",
    notes: "Dados variam bastante por ano e mercado.",
    isEstimated: true,
  },
  {
    id: "fallback-fiat-uno-15r-1987-1989",
    brand: "Fiat",
    model: "Uno",
    generationName: "Primeira geração",
    version: "1.5R",
    yearStart: 1987,
    yearEnd: 1989,
    engineOriginal: "Fiasa 1.5",
    inductionOriginal: "Carburador",
    powerHp: 86,
    drivetrain: "Dianteira",
    transmission: "Manual",
    fuelType: "Gasolina/álcool",
    notes: "Referência aproximada para versão esportiva.",
    isEstimated: true,
  },
  {
    id: "fallback-chevrolet-opala-comodoro-1975-1992",
    brand: "Chevrolet",
    model: "Opala",
    generationName: "Nacional",
    version: "Comodoro",
    yearStart: 1975,
    yearEnd: 1992,
    engineOriginal: "4.1 seis cilindros ou 2.5 quatro cilindros",
    inductionOriginal: "Carburador",
    powerHp: 121,
    drivetrain: "Traseira",
    transmission: "Manual/automático",
    fuelType: "Gasolina/álcool",
    notes: "Referência aproximada; confirmar motor original.",
    isEstimated: true,
  },
  {
    id: "fallback-chevrolet-opala-diplomata-1980-1992",
    brand: "Chevrolet",
    model: "Opala",
    generationName: "Nacional",
    version: "Diplomata",
    yearStart: 1980,
    yearEnd: 1992,
    engineOriginal: "4.1 seis cilindros",
    inductionOriginal: "Carburador",
    powerHp: 121,
    drivetrain: "Traseira",
    transmission: "Manual/automático",
    fuelType: "Gasolina/álcool",
    notes: "Referência aproximada para modelos de luxo.",
    isEstimated: true,
  },
  {
    id: "fallback-chevrolet-kadett-sl-1989-1993",
    brand: "Chevrolet",
    model: "Kadett",
    generationName: "Nacional",
    version: "SL",
    yearStart: 1989,
    yearEnd: 1993,
    engineOriginal: "1.8",
    inductionOriginal: "Carburador",
    powerHp: 95,
    drivetrain: "Dianteira",
    transmission: "Manual",
    fuelType: "Gasolina/álcool",
    notes: "Dados aproximados.",
    isEstimated: true,
  },
  {
    id: "fallback-chevrolet-kadett-gl-1994-1998",
    brand: "Chevrolet",
    model: "Kadett",
    generationName: "Nacional",
    version: "GL",
    yearStart: 1994,
    yearEnd: 1998,
    engineOriginal: "1.8 ou 2.0 dependendo do ano",
    inductionOriginal: "Injeção eletrônica",
    powerHp: 110,
    drivetrain: "Dianteira",
    transmission: "Manual",
    fuelType: "Gasolina/álcool",
    notes: "Dados aproximados; conferir ano exato.",
    isEstimated: true,
  },
  {
    id: "fallback-chevrolet-kadett-gsi-1991-1995",
    brand: "Chevrolet",
    model: "Kadett",
    generationName: "Nacional",
    version: "GSi",
    yearStart: 1991,
    yearEnd: 1995,
    engineOriginal: "2.0",
    inductionOriginal: "Injeção eletrônica",
    powerHp: 121,
    drivetrain: "Dianteira",
    transmission: "Manual",
    fuelType: "Gasolina",
    notes: "Referência aproximada para GSi.",
    isEstimated: true,
  },
  {
    id: "fallback-chevrolet-chevette-sl-1978-1993",
    brand: "Chevrolet",
    model: "Chevette",
    generationName: "Nacional",
    version: "SL",
    yearStart: 1978,
    yearEnd: 1993,
    engineOriginal: "1.4 ou 1.6 dependendo do ano",
    inductionOriginal: "Carburador",
    powerHp: 68,
    drivetrain: "Traseira",
    transmission: "Manual",
    fuelType: "Gasolina/álcool",
    notes: "Dados aproximados.",
    isEstimated: true,
  },
  {
    id: "fallback-chevrolet-chevette-se-1987-1993",
    brand: "Chevrolet",
    model: "Chevette",
    generationName: "Nacional",
    version: "SE",
    yearStart: 1987,
    yearEnd: 1993,
    engineOriginal: "1.6/S",
    inductionOriginal: "Carburador",
    powerHp: 73,
    drivetrain: "Traseira",
    transmission: "Manual",
    fuelType: "Gasolina/álcool",
    notes: "Dados aproximados; conferir configuração.",
    isEstimated: true,
  },
];

export function normalizeCatalogText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function matchingCatalogVersions(
  catalogVersions: CarCatalogVersion[],
  brand: string,
  model: string,
  yearValue: string | number
) {
  const normalizedBrand = normalizeCatalogText(brand);
  const normalizedModel = normalizeCatalogText(model);
  const year = typeof yearValue === "number" ? yearValue : Number.parseInt(String(yearValue), 10);

  if (!normalizedBrand || !normalizedModel || !Number.isFinite(year)) return [];

  return catalogVersions.filter((item) => {
    const itemBrand = normalizeCatalogText(item.brand);
    const itemModel = normalizeCatalogText(item.model);
    return (
      (itemBrand.includes(normalizedBrand) || normalizedBrand.includes(itemBrand)) &&
      (itemModel.includes(normalizedModel) || normalizedModel.includes(itemModel)) &&
      year >= item.yearStart &&
      year <= item.yearEnd
    );
  });
}

export function factorySpecSummary(version: CarCatalogVersion | null | undefined) {
  if (!version) return [];
  return [
    ["Motor", version.engineOriginal],
    ["Alimentação", version.inductionOriginal],
    ["Potência original aprox.", version.powerHp ? `${version.powerHp} cv` : null],
    ["Tração", version.drivetrain],
    ["Câmbio", version.transmission],
    ["Combustível", version.fuelType],
  ].filter((item): item is [string, string] => Boolean(item[1]));
}

export function calculateSpecConfidence(values: {
  versionConfidence?: DataConfidence | string | null;
  originalEngineAnswer?: DetailAnswer | string | null;
  originalInductionAnswer?: DetailAnswer | string | null;
  originalColorAnswer?: DetailAnswer | string | null;
  originalWheelsAnswer?: DetailAnswer | string | null;
  originalInteriorAnswer?: DetailAnswer | string | null;
  originalSuspensionAnswer?: DetailAnswer | string | null;
}) {
  const answers = [
    values.versionConfidence,
    values.originalEngineAnswer,
    values.originalInductionAnswer,
    values.originalColorAnswer,
    values.originalWheelsAnswer,
    values.originalInteriorAnswer,
    values.originalSuspensionAnswer,
  ];

  const answered = answers.filter((answer) => answer === "confirmed" || answer === "estimated" || answer === "unknown" || answer === "yes" || answer === "no").length;
  return Math.round((answered / answers.length) * 100);
}
