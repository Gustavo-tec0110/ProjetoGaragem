import type { Project, ProjectExpense, ProjectPart, ProjectSeed, ProjectUpdate } from "@/lib/projects/types";
import { enrichProject } from "@/lib/projects/utils";

const imageSets = {
  gol: [
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=1600&q=80",
  ],
  chevette: [
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1600&q=80",
  ],
  civic: [
    "https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1600&q=80",
  ],
  corsa: [
    "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1600&q=80",
  ],
  saveiro: [
    "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1600&q=80",
  ],
  opala: [
    "https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1600&q=80",
  ],
  uno: [
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1486496572940-2bb2341fdbdf?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1507136566006-cfc505b114fc?auto=format&fit=crop&w=1600&q=80",
  ],
  fusca: [
    "https://images.unsplash.com/photo-1502877828070-33a9c7d1b4c2?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1485463611174-f302f6a5c1c9?auto=format&fit=crop&w=1600&q=80",
  ],
};

function part(id: string, name: string, category: string, priceEstimate: number, status: "installed" | "planned") {
  return {
    id,
    name,
    category,
    priceEstimate,
    status,
    brand: null,
    description: null,
  };
}

function autoUpdates(project: {
  id: string;
  mainImage: string;
  installedParts: ProjectPart[];
  plannedParts: ProjectPart[];
  createdAt: string;
  updatedAt: string;
}): ProjectUpdate[] {
  const installed = project.installedParts.slice(0, 2).map((part, index) => ({
    id: `${project.id}-update-installed-${index + 1}`,
    title: `Instalacao de ${part.name}`,
    description: `Atualizacao registrada para acompanhar a evolucao do projeto na garagem.`,
    photo: project.mainImage,
    date: index === 0 ? project.updatedAt : project.createdAt,
    amount: part.priceEstimate,
  }));

  const planned = project.plannedParts.slice(0, 1).map((part, index) => ({
    id: `${project.id}-update-planned-${index + 1}`,
    title: `Planejamento de ${part.name}`,
    description: `Proxima etapa mapeada para manter o build em evolucao constante.`,
    photo: project.mainImage,
    date: project.updatedAt,
    amount: part.priceEstimate,
  }));

  return [...installed, ...planned];
}

function autoExpenses(project: {
  installedParts: ProjectPart[];
  plannedParts: ProjectPart[];
}): ProjectExpense[] {
  return [...project.installedParts, ...project.plannedParts].map((part, index) => ({
    id: `expense-${part.id}`,
    name: part.name,
    category: part.category,
    amount: Math.max(0, part.priceEstimate ?? 0),
    date: new Date(2026, 4, 1 + index).toISOString(),
  }));
}

function createProject(project: Omit<ProjectSeed, "source" | "databaseId" | "ownerId" | "ownerUsername" | "viewerHasLiked" | "viewerHasSaved" | "editHref" | "isPublic"> & { ownerId?: string | null; ownerUsername?: string | null }) {
  return enrichProject({
    ...project,
    source: "demo" as const,
    databaseId: null,
    ownerId: project.ownerId ?? null,
    ownerUsername: project.ownerUsername ?? null,
    updates: project.updates ?? autoUpdates(project),
    expenses: project.expenses ?? autoExpenses(project),
    projectGoal: project.projectGoal ?? project.shortDescription,
    viewerHasLiked: false,
    viewerHasSaved: false,
    editHref: null,
    isPublic: true,
  });
}

export const demoProjects: Project[] = [
  createProject({
    id: "gol-quadrado-1994-ap18",
    slug: "gol-quadrado-1994-ap18",
    ownerName: "Lucas AP",
    title: "Gol Quadrado 1994 AP 1.8",
    carModel: "Volkswagen Gol CL 1.8",
    brand: "Volkswagen",
    model: "Gol Quadrado",
    year: 1994,
    engine: "AP 1.8 injetado",
    style: "Sleeper",
    shortDescription: "Gol de rua com cara discreta, AP girador e foco em confiabilidade.",
    description:
      "Projeto montado para andar todo fim de semana, com pegada sleeper e acerto limpo. A ideia e manter visual classico, interior honesto e mecanica redonda para viagens curtas e encontros.",
    mainImage: imageSets.gol[0],
    gallery: imageSets.gol,
    installedParts: [
      part("gol-1", "Comando 272", "Motor", 1200, "installed"),
      part("gol-2", "Coilover regulavel", "Suspensao", 3400, "installed"),
      part("gol-3", "Rodas aro 15", "Rodas", 2800, "installed"),
    ],
    plannedParts: [
      part("gol-4", "Wideband", "Eletronica", 900, "planned"),
      part("gol-5", "Freio dianteiro ventilado", "Freios", 1800, "planned"),
    ],
    estimatedCost: 10100,
    status: "Acerto fino",
    likes: 248,
    saves: 96,
    views: 4820,
    comments: 18,
    tags: ["AP", "Sleeper", "Nacional", "Rua"],
    city: "Curitiba",
    state: "PR",
    createdAt: "2026-05-29T18:00:00.000Z",
    updatedAt: "2026-05-31T19:00:00.000Z",
  }),
  createProject({
    id: "chevette-turbo-street",
    slug: "chevette-turbo-street",
    ownerName: "Rafa Turbo",
    title: "Chevette turbo",
    carModel: "Chevrolet Chevette SL",
    brand: "Chevrolet",
    model: "Chevette",
    year: 1979,
    engine: "1.6 turbo carburado",
    style: "Turbo",
    shortDescription: "Chevette leve, traseira e pronto para brincar com pressao baixa.",
    description:
      "Build raiz com pegada old school: turbina pequena, cambio acertado e foco total em resposta. Ainda esta em fase de acabamento, mas ja entrega diversao suficiente para arrancadas e rolês noturnos.",
    mainImage: imageSets.chevette[0],
    gallery: imageSets.chevette,
    installedParts: [
      part("chevette-1", "Turbina .42/.48", "Turbo", 3200, "installed"),
      part("chevette-2", "Dosador HP", "Alimentacao", 680, "installed"),
      part("chevette-3", "Embreagem ceramica", "Cambio", 1900, "installed"),
    ],
    plannedParts: [
      part("chevette-4", "Injecao programavel", "Eletronica", 4200, "planned"),
      part("chevette-5", "Intercooler frontal", "Arrefecimento", 1400, "planned"),
    ],
    estimatedCost: 11380,
    status: "Em evolucao",
    likes: 415,
    saves: 170,
    views: 9104,
    comments: 27,
    tags: ["Turbo", "Traseira", "Old school", "Arrancada"],
    city: "Goiania",
    state: "GO",
    createdAt: "2026-05-27T13:00:00.000Z",
    updatedAt: "2026-05-30T22:15:00.000Z",
  }),
  createProject({
    id: "civic-aspirado-rua",
    slug: "civic-aspirado-rua",
    ownerName: "Mari VTEC",
    title: "Civic aspirado",
    carModel: "Honda Civic EXS",
    brand: "Honda",
    model: "Civic",
    year: 2008,
    engine: "R18 aspirado com intake e escape",
    style: "Aspirado",
    shortDescription: "Civic de uso diario, limpo e com upgrade pensado em dirigibilidade.",
    description:
      "Nao e projeto de numero, e projeto de conjunto. Intake, escape, rodas leves e setup para estrada boa. A proposta e divertir sem comprometer conforto e manter um visual OEM+ de respeito.",
    mainImage: imageSets.civic[0],
    gallery: imageSets.civic,
    installedParts: [
      part("civic-1", "Intake frio", "Motor", 1200, "installed"),
      part("civic-2", "Catback inox", "Escape", 2600, "installed"),
      part("civic-3", "Molas esportivas", "Suspensao", 1500, "installed"),
    ],
    plannedParts: [
      part("civic-4", "Rodas flowforming", "Rodas", 5200, "planned"),
      part("civic-5", "Remap aspirado", "Eletronica", 1800, "planned"),
    ],
    estimatedCost: 12300,
    status: "Projeto ativo",
    likes: 332,
    saves: 141,
    views: 7044,
    comments: 14,
    tags: ["Honda", "VTEC", "Aspirado", "OEM+"],
    city: "Sao Paulo",
    state: "SP",
    createdAt: "2026-05-20T17:00:00.000Z",
    updatedAt: "2026-05-29T08:45:00.000Z",
  }),
  createProject({
    id: "corsa-de-pista",
    slug: "corsa-de-pista",
    ownerName: "Time Attack BR",
    title: "Corsa de pista",
    carModel: "Chevrolet Corsa Hatch",
    brand: "Chevrolet",
    model: "Corsa",
    year: 2002,
    engine: "1.8 aspirado com acerto track",
    style: "Track",
    shortDescription: "Hatch leve para track day com foco em freio, pneu e acerto fino.",
    description:
      "Projeto montado para pista curta e track day. Prioridade total em dinamica: bancos concha, rodas leves, alinhamento agressivo e confiabilidade para aguentar bateria atras de bateria.",
    mainImage: imageSets.corsa[0],
    gallery: imageSets.corsa,
    installedParts: [
      part("corsa-1", "Semislick 205", "Pneus", 3800, "installed"),
      part("corsa-2", "Banco concha", "Seguranca", 2600, "installed"),
      part("corsa-3", "Pastilhas high temp", "Freios", 1500, "installed"),
    ],
    plannedParts: [
      part("corsa-4", "Kit coilover premium", "Suspensao", 6400, "planned"),
      part("corsa-5", "Radiador aluminio", "Arrefecimento", 1800, "planned"),
    ],
    estimatedCost: 16100,
    status: "Em evolucao",
    likes: 289,
    saves: 118,
    views: 6580,
    comments: 16,
    tags: ["Track", "Leve", "Pista", "Semislick"],
    city: "Belo Horizonte",
    state: "MG",
    createdAt: "2026-05-24T19:30:00.000Z",
    updatedAt: "2026-05-31T12:10:00.000Z",
  }),
  createProject({
    id: "saveiro-rebaixada",
    slug: "saveiro-rebaixada",
    ownerName: "Nando Low",
    title: "Saveiro rebaixada",
    carModel: "Volkswagen Saveiro G5",
    brand: "Volkswagen",
    model: "Saveiro",
    year: 2012,
    engine: "1.6 EA111 aspirado",
    style: "Stance",
    shortDescription: "Saveiro clean de rua com foco em altura, encaixe e acabamento.",
    description:
      "Setup de stance pensado para andar na cidade e chamar atencao sem exagero. Caamba limpa, aro encaixado, interior simples e varias pequenas melhorias de acabamento.",
    mainImage: imageSets.saveiro[0],
    gallery: imageSets.saveiro,
    installedParts: [
      part("saveiro-1", "Ar 4 vias", "Suspensao", 7200, "installed"),
      part("saveiro-2", "Rodas tala larga", "Rodas", 4900, "installed"),
      part("saveiro-3", "Volante esportivo", "Interior", 950, "installed"),
    ],
    plannedParts: [
      part("saveiro-4", "Som slim na caamba", "Som", 2600, "planned"),
      part("saveiro-5", "Farol mascara negra", "Exterior", 1100, "planned"),
    ],
    estimatedCost: 16750,
    status: "Projeto ativo",
    likes: 527,
    saves: 255,
    views: 12220,
    comments: 33,
    tags: ["Stance", "Aro", "Ar", "Caamba limpa"],
    city: "Campinas",
    state: "SP",
    createdAt: "2026-05-18T10:20:00.000Z",
    updatedAt: "2026-05-30T14:00:00.000Z",
  }),
  createProject({
    id: "opala-seis-cilindros",
    slug: "opala-seis-cilindros",
    ownerName: "Beto 6cc",
    title: "Opala seis cilindros",
    carModel: "Chevrolet Opala Coupe",
    brand: "Chevrolet",
    model: "Opala",
    year: 1978,
    engine: "4.1 seis cilindros carburado",
    style: "Projeto premium",
    shortDescription: "Restomod classico com seis cilindros liso, visual alinhado e muito torque.",
    description:
      "O foco aqui e preservar a alma do Opala com alguns toques modernos. Direcao, freio, acabamento e acerto para transformar o seis cilindros em carro de final de semana que faz qualquer um olhar duas vezes.",
    mainImage: imageSets.opala[0],
    gallery: imageSets.opala,
    installedParts: [
      part("opala-1", "Carburador retrabalhado", "Motor", 2800, "installed"),
      part("opala-2", "Freio dianteiro maior", "Freios", 3600, "installed"),
      part("opala-3", "Jogo de rodas classicas", "Rodas", 4200, "installed"),
    ],
    plannedParts: [
      part("opala-4", "Cambio revisado", "Cambio", 2900, "planned"),
      part("opala-5", "Escapamento dimensionado", "Escape", 2400, "planned"),
    ],
    estimatedCost: 15900,
    status: "Acerto fino",
    likes: 612,
    saves: 310,
    views: 14350,
    comments: 41,
    tags: ["6 cilindros", "Classico", "Restomod", "Torque"],
    city: "Porto Alegre",
    state: "RS",
    createdAt: "2026-05-10T09:00:00.000Z",
    updatedAt: "2026-05-28T17:35:00.000Z",
  }),
  createProject({
    id: "uno-turbo-street",
    slug: "uno-turbo-street",
    ownerName: "Gui Fire",
    title: "Uno turbo",
    carModel: "Fiat Uno Mille",
    brand: "Fiat",
    model: "Uno",
    year: 1998,
    engine: "Fire 1.0 turbo",
    style: "Turbo",
    shortDescription: "Uno leve e nervoso, montado para rua com resposta rapida e muita pressao.",
    description:
      "A ideia e explorar o quanto o peso baixo ajuda no desempenho. Projeto em evolucao com bastante acerto de combustivel, embreagem e pneus para colocar no chao o que o turbo ja entrega.",
    mainImage: imageSets.uno[0],
    gallery: imageSets.uno,
    installedParts: [
      part("uno-1", "Turbina pequena", "Turbo", 2500, "installed"),
      part("uno-2", "Bicos maiores", "Alimentacao", 980, "installed"),
      part("uno-3", "Downpipe 2.5", "Escape", 1250, "installed"),
    ],
    plannedParts: [
      part("uno-4", "Intercooler frontal", "Arrefecimento", 1500, "planned"),
      part("uno-5", "Wideband + boost gauge", "Eletronica", 1300, "planned"),
    ],
    estimatedCost: 7530,
    status: "Em evolucao",
    likes: 468,
    saves: 220,
    views: 11804,
    comments: 29,
    tags: ["Fire", "Turbo", "Leve", "Rua"],
    city: "Recife",
    state: "PE",
    createdAt: "2026-05-25T21:15:00.000Z",
    updatedAt: "2026-05-31T21:40:00.000Z",
  }),
  createProject({
    id: "fusca-boxer-preparado",
    slug: "fusca-boxer-preparado",
    ownerName: "Caio Boxer",
    title: "Fusca boxer preparado",
    carModel: "Volkswagen Fusca 1300",
    brand: "Volkswagen",
    model: "Fusca",
    year: 1974,
    engine: "Boxer 1600 com dupla carburacao",
    style: "Projeto premium",
    shortDescription: "Fusca de rua com boxer preparado, freio revisto e visual limpo.",
    description:
      "Projeto com muita atencao a mecanica e acabamento. Boxer preparado, cambio revisado e conjunto pensado para curtir estrada, evento e aquele role de domingo com cheiro de gasolina e historia.",
    mainImage: imageSets.fusca[0],
    gallery: imageSets.fusca,
    installedParts: [
      part("fusca-1", "Dupla carburacao", "Motor", 2600, "installed"),
      part("fusca-2", "Disco ventilado dianteiro", "Freios", 2100, "installed"),
      part("fusca-3", "Bancos reformados", "Interior", 1800, "installed"),
    ],
    plannedParts: [
      part("fusca-4", "Caixa de direcao revisada", "Seguranca", 950, "planned"),
      part("fusca-5", "Jogo de instrumentos", "Interior", 1400, "planned"),
    ],
    estimatedCost: 8850,
    status: "Projeto ativo",
    likes: 355,
    saves: 147,
    views: 6825,
    comments: 19,
    tags: ["Boxer", "Classico", "VW aircooled", "Estrada"],
    city: "Florianopolis",
    state: "SC",
    createdAt: "2026-05-22T11:00:00.000Z",
    updatedAt: "2026-05-29T16:25:00.000Z",
  }),
];
