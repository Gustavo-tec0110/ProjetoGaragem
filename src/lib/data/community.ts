import type { CarId, StyleId } from "@/lib/types";

export type CommunityBadgeId =
  | "jdm_expert"
  | "drift_builder"
  | "sleeper_master"
  | "turbo_lover";

export const communityBadgeLabels: Record<CommunityBadgeId, string> = {
  jdm_expert: "JDM Expert",
  drift_builder: "Drift Builder",
  sleeper_master: "Sleeper Master",
  turbo_lover: "Turbo Lover",
};

export type CommunityCreator = {
  id: string;
  name: string;
  handle: string;
  tagline: string;
  badges: CommunityBadgeId[];
  favoriteCar: string;
  location: string;
};

export const communityCreators: CommunityCreator[] = [
  {
    id: "u_kyoto",
    name: "KyotoSpec",
    handle: "kyoto-spec",
    tagline: "JDM limpo, fitment preciso e compatibilidade sem drama.",
    badges: ["jdm_expert", "turbo_lover"],
    favoriteCar: "Honda Civic G8",
    location: "SP",
  },
  {
    id: "u_luna",
    name: "Luna Drift",
    handle: "luna-drift",
    tagline: "Setup de suspensão, pneus e controle — slide com segurança.",
    badges: ["drift_builder"],
    favoriteCar: "VW Gol G5",
    location: "PR",
  },
  {
    id: "u_sleeper",
    name: "SleeperHQ",
    handle: "sleeper-hq",
    tagline: "Visual discreto por fora, resposta rápida por baixo do capô.",
    badges: ["sleeper_master", "turbo_lover"],
    favoriteCar: "Chevrolet Onix",
    location: "RJ",
  },
  {
    id: "u_bass",
    name: "Bass Clean",
    handle: "bass-clean",
    tagline: "Som premium com instalação limpa e upgrade modular.",
    badges: ["turbo_lover"],
    favoriteCar: "Hyundai HB20",
    location: "MG",
  },
];

export type CommunityBuildPost = {
  id: string;
  name: string;
  car: string;
  carId: CarId;
  style: string;
  styleId: StyleId;
  compatibility: number;
  priceRange: string;
  baseLikes: number;
  baseSaves: number;
  baseComments: number;
  creatorId: string;
  highlighted?: boolean;
  image: string;
};

export const communityBuilds: CommunityBuildPost[] = [
  {
    id: "b1",
    name: "Neon Fitment",
    car: "Civic G8",
    carId: "civic-g8",
    style: "Rebaixado",
    styleId: "rebaixado",
    compatibility: 92,
    priceRange: "R$ 12k–18k",
    baseLikes: 1842,
    baseSaves: 512,
    baseComments: 48,
    creatorId: "u_kyoto",
    highlighted: true,
    image: "/ref/hero-car.jpg",
  },
  {
    id: "b6",
    name: "Kyoto Nights",
    car: "Civic G8",
    carId: "civic-g8",
    style: "JDM",
    styleId: "jdm",
    compatibility: 91,
    priceRange: "R$ 10k–25k",
    baseLikes: 3120,
    baseSaves: 840,
    baseComments: 57,
    creatorId: "u_kyoto",
    image: "/ref/hero-car.jpg",
  },
  {
    id: "b2",
    name: "Silent Killer",
    car: "Onix",
    carId: "onix",
    style: "Sleeper",
    styleId: "sleeper",
    compatibility: 89,
    priceRange: "R$ 9k–15k",
    baseLikes: 1260,
    baseSaves: 388,
    baseComments: 31,
    creatorId: "u_sleeper",
    image: "/ref/car-black.jpg",
  },
  {
    id: "b3",
    name: "Boost Street",
    car: "Golf MK7",
    carId: "golf-mk7",
    style: "Turbo Street",
    styleId: "turbostreet",
    compatibility: 94,
    priceRange: "R$ 25k–40k",
    baseLikes: 2490,
    baseSaves: 721,
    baseComments: 63,
    creatorId: "u_kyoto",
    image: "/ref/car-white.jpg",
  },
  {
    id: "b4",
    name: "Sideways Clinic",
    car: "Gol G5",
    carId: "gol-g5",
    style: "Drift",
    styleId: "drift",
    compatibility: 84,
    priceRange: "R$ 10k–20k",
    baseLikes: 2314,
    baseSaves: 459,
    baseComments: 52,
    creatorId: "u_luna",
    image: "/ref/car-black.jpg",
  },
  {
    id: "b5",
    name: "Bass Clean 2.0",
    car: "HB20",
    carId: "hb20",
    style: "Som Automotivo",
    styleId: "som",
    compatibility: 88,
    priceRange: "R$ 3k–9k",
    baseLikes: 2875,
    baseSaves: 612,
    baseComments: 44,
    creatorId: "u_bass",
    image: "/ref/car-white.jpg",
  },
];

export type SeedComment = {
  id: string;
  creatorId: string;
  message: string;
  createdAt: string;
};

export const seedCommentsByBuildId: Record<string, SeedComment[]> = {
  b1: [
    {
      id: "c_b1_1",
      creatorId: "u_luna",
      message: "Fitment tá agressivo, mas ficou limpo. Só cuidaria do perfil do pneu pra daily.",
      createdAt: "há 2h",
    },
    {
      id: "c_b1_2",
      creatorId: "u_sleeper",
      message: "Compatibilidade 92% e orçamento bem no alvo. Setup perfeito pra viralizar.",
      createdAt: "há 1h",
    },
  ],
  b2: [
    {
      id: "c_b2_1",
      creatorId: "u_kyoto",
      message: "Sleeper de respeito. Mantém o visual stock, mas a resposta fica outra.",
      createdAt: "há 3h",
    },
  ],
};
