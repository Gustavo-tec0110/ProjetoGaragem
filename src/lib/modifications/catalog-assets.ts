const categoryFolders = {
  "motor-performance": "engine",
  suspensao: "suspension",
  freios: "brakes",
  "rodas-pneus": "wheels",
  transmissao: "transmission",
  interior: "interior",
  exterior: "exterior",
  iluminacao: "lighting",
  "eletrica-eletronica": "electrical",
  som: "audio",
} as const;

const catalogAssetSlugs = new Set([
  "turbo", "supercharger", "intercooler", "intake-filtro-esportivo", "coletor-admissao", "coletor-escape", "downpipe", "escape", "bicos-injetores", "bomba-combustivel", "regulador-pressao", "ecu-modulo", "bobinas", "velas", "radiador", "motor", "cabecote", "comando", "pistoes-bielas",
  "coilover", "suspensao-rosca", "suspensao-fixa", "molas", "amortecedores", "barra-estabilizadora", "buchas", "bracos", "camber-alinhamento",
  "discos", "pincas", "pastilhas", "mangueiras", "kit-freio",
  "rodas", "pneus", "espacadores", "adaptadores",
  "cambio", "embreagem", "diferencial", "short-shifter", "alavanca", "relacoes-marcha",
  "banco-esportivo", "banco-concha", "volante", "manopla", "pedaleiras", "cintos", "roll-cage", "instrumentacao-interior", "painel-digital",
  "aerofolio", "spoiler", "front-lip", "side-skirts", "difusor", "body-kit", "capo", "para-choque",
  "farois", "lanternas", "farois-auxiliares", "drl",
  "chicote", "reles", "fusiveis", "sensores", "wideband", "instrumentacao-eletrica", "sistema-eletrico-customizado",
  "alto-falantes", "subwoofer", "amplificador", "multimidia",
]);

/** Returns the packaged default asset, or null when the source sheets have no matching illustration. */
export function getCatalogAssetPath(categorySlug: string, catalogSlug: string) {
  const folder = categoryFolders[categorySlug as keyof typeof categoryFolders];
  if (!folder || !catalogAssetSlugs.has(catalogSlug)) return null;
  return `/modifications/${folder}/${catalogSlug}.webp`;
}
