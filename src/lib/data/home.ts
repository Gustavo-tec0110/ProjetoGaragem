import type { Car, Style } from "@/lib/types";

export const styles: Style[] = [
  {
    id: "jdm",
    label: "JDM",
    badge: "Iluminação forte",
    tagline: "Aerodinâmica, rodas agressivas e detalhes japoneses clássicos.",
    backdrop:
      "radial-gradient(900px circle at 20% 10%, rgba(255,77,0,0.26), transparent 60%), radial-gradient(700px circle at 90% 30%, rgba(255,123,0,0.18), transparent 55%), linear-gradient(135deg, rgba(26,27,34,0.92), rgba(17,18,22,0.92))",
  },
  {
    id: "sleeper",
    label: "Sleeper",
    badge: "Frio por fora",
    tagline: "Visual discreto por fora, setup forte por baixo do capô.",
    backdrop:
      "radial-gradient(900px circle at 30% 0%, rgba(255,77,0,0.18), transparent 60%), linear-gradient(135deg, rgba(17,18,22,0.92), rgba(26,27,34,0.92))",
  },
  {
    id: "corrida",
    label: "Corrida",
    badge: "Performance",
    tagline: "Grip, freio e confiabilidade — sem perder o visual de pista.",
    backdrop:
      "radial-gradient(900px circle at 65% 10%, rgba(255,77,0,0.24), transparent 60%), radial-gradient(700px circle at 20% 50%, rgba(255,123,0,0.14), transparent 55%), linear-gradient(135deg, rgba(26,27,34,0.92), rgba(17,18,22,0.92))",
  },
  {
    id: "rebaixado",
    label: "Rebaixado",
    badge: "Fitment",
    tagline: "Altura baixa, rodas no limite e encaixe perfeito sem raspar.",
    backdrop:
      "radial-gradient(900px circle at 20% 15%, rgba(255,77,0,0.22), transparent 60%), linear-gradient(135deg, rgba(17,18,22,0.92), rgba(26,27,34,0.92))",
  },
  {
    id: "som",
    label: "Som Automotivo",
    badge: "Grave limpo",
    tagline: "Som premium com instalação inteligente, estética e praticidade.",
    backdrop:
      "radial-gradient(900px circle at 70% 15%, rgba(255,77,0,0.22), transparent 60%), radial-gradient(800px circle at 15% 55%, rgba(255,123,0,0.14), transparent 55%), linear-gradient(135deg, rgba(26,27,34,0.92), rgba(17,18,22,0.92))",
  },
  {
    id: "drift",
    label: "Drift",
    badge: "Slide control",
    tagline: "Setup de suspensão, pneus e aderência pra brincar com segurança.",
    backdrop:
      "radial-gradient(900px circle at 20% 10%, rgba(255,77,0,0.22), transparent 60%), radial-gradient(800px circle at 85% 55%, rgba(255,123,0,0.14), transparent 55%), linear-gradient(135deg, rgba(17,18,22,0.92), rgba(26,27,34,0.92))",
  },
  {
    id: "rally",
    label: "Rally",
    badge: "All terrain",
    tagline: "Robustez, curso de suspensão e iluminação pra qualquer terreno.",
    backdrop:
      "radial-gradient(900px circle at 30% 10%, rgba(255,77,0,0.20), transparent 60%), linear-gradient(135deg, rgba(26,27,34,0.92), rgba(17,18,22,0.92))",
  },
  {
    id: "oemplus",
    label: "OEM+",
    badge: "Clean",
    tagline: "Upgrade discreto e refinado: parece original, mas melhor.",
    backdrop:
      "radial-gradient(900px circle at 20% 0%, rgba(255,77,0,0.16), transparent 60%), radial-gradient(800px circle at 80% 60%, rgba(255,123,0,0.12), transparent 55%), linear-gradient(135deg, rgba(17,18,22,0.92), rgba(26,27,34,0.92))",
  },
  {
    id: "luxo",
    label: "Luxo",
    badge: "Premium",
    tagline: "Detalhes refinados, conforto e acabamento de categoria superior.",
    backdrop:
      "radial-gradient(900px circle at 65% 15%, rgba(255,77,0,0.18), transparent 60%), linear-gradient(135deg, rgba(26,27,34,0.92), rgba(17,18,22,0.92))",
  },
  {
    id: "turbostreet",
    label: "Turbo Street",
    badge: "Boost",
    tagline: "Turbina, intake e escape com equilíbrio e segurança.",
    backdrop:
      "radial-gradient(900px circle at 25% 10%, rgba(255,77,0,0.24), transparent 60%), radial-gradient(800px circle at 90% 55%, rgba(255,123,0,0.14), transparent 55%), linear-gradient(135deg, rgba(26,27,34,0.92), rgba(17,18,22,0.92))",
  },
];

export const cars: Car[] = [
  {
    id: "civic-g8",
    name: "Honda Civic G8",
    segment: "Sedan",
    power: "Potência: ~140–180cv (dependendo do motor)",
    fuelConsumption: "Médio: 10–13 km/l",
    commonIssues: "Coxins, arrefecimento e manutenção preventiva de suspensão.",
    avgProjectCost: "R$ 10k–25k",
    wheelClearance: { maxInches: 18, minOffset: 35 },
  },
  {
    id: "gol-g5",
    name: "VW Gol G5",
    segment: "Hatch",
    power: "Potência: ~70–104cv",
    fuelConsumption: "Médio: 11–14 km/l",
    commonIssues: "Buchas, barulhos internos e cuidado com arrefecimento em uso pesado.",
    avgProjectCost: "R$ 6k–18k",
    wheelClearance: { maxInches: 17, minOffset: 38 },
  },
  {
    id: "golf-mk7",
    name: "VW Golf MK7",
    segment: "Hatch premium",
    power: "Potência: ~150–230cv",
    fuelConsumption: "Médio: 10–14 km/l",
    commonIssues: "Manutenção de câmbio (quando aplicável) e eletrônica sensível.",
    avgProjectCost: "R$ 15k–40k",
    wheelClearance: { maxInches: 19, minOffset: 35 },
  },
  {
    id: "hb20",
    name: "Hyundai HB20",
    segment: "Hatch",
    power: "Potência: ~80–130cv",
    fuelConsumption: "Médio: 11–15 km/l",
    commonIssues: "Suspensão dianteira e manutenção preventiva de direção.",
    avgProjectCost: "R$ 7k–20k",
    wheelClearance: { maxInches: 18, minOffset: 38 },
  },
  {
    id: "onix",
    name: "Chevrolet Onix",
    segment: "Hatch",
    power: "Potência: ~78–116cv",
    fuelConsumption: "Médio: 12–16 km/l",
    commonIssues: "Revisões em dia e cuidado com componentes de arrefecimento.",
    avgProjectCost: "R$ 7k–22k",
    wheelClearance: { maxInches: 18, minOffset: 38 },
  },
  {
    id: "corolla",
    name: "Toyota Corolla",
    segment: "Sedan",
    power: "Potência: ~144–177cv",
    fuelConsumption: "Médio: 10–14 km/l",
    commonIssues: "Manutenção de suspensão e cuidados com freios em uso urbano pesado.",
    avgProjectCost: "R$ 12k–35k",
    wheelClearance: { maxInches: 19, minOffset: 35 },
  },
];

export const featuredBuilds = [
  {
    id: "b1",
    name: "Neon Fitment",
    car: "Civic G8",
    style: "Rebaixado",
    compatibility: 92,
    likes: 1842,
    priceRange: "R$ 12k–18k",
  },
  {
    id: "b2",
    name: "Silent Killer",
    car: "Onix",
    style: "Sleeper",
    compatibility: 89,
    likes: 1260,
    priceRange: "R$ 9k–15k",
  },
  {
    id: "b3",
    name: "Boost Street",
    car: "Golf MK7",
    style: "Turbo Street",
    compatibility: 94,
    likes: 2490,
    priceRange: "R$ 25k–40k",
  },
];

export const weeklyRanking = [
  { id: "r1", category: "JDM", name: "Kyoto Spec", car: "Civic G8", likes: 3120 },
  { id: "r2", category: "Som", name: "Bass Clean", car: "HB20", likes: 2875 },
  { id: "r3", category: "Sleeper", name: "Stock Look", car: "Onix", likes: 2541 },
  { id: "r4", category: "Drift", name: "Sideways", car: "Gol G5", likes: 2314 },
];

export const kitTeasers = [
  {
    id: "k1",
    name: "Kit Fitment Street",
    description: "Rodas + suspensão + alinhamento com encaixe seguro.",
    priceRange: "R$ 6k–12k",
  },
  {
    id: "k2",
    name: "Kit Turbo Light",
    description: "Intake + escape + preparação leve pra resposta rápida.",
    priceRange: "R$ 8k–18k",
  },
  {
    id: "k3",
    name: "Kit Som Premium",
    description: "Som de qualidade com instalação limpa e upgrade modular.",
    priceRange: "R$ 3k–9k",
  },
];

