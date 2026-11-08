export type Modele =
  | "abri-bus"
  | "abri-velo"
  | "agres"
  | "arbre"
  | "arceau"
  | "bac"
  | "banc"
  | "bande"
  | "borne"
  | "boite-livres"
  | "bus"
  | "but"
  | "cabane"
  | "composteur"
  | "cycliste"
  | "ecran"
  | "frigo"
  | "hotel-insectes"
  | "jardiniere"
  | "lampadaire"
  | "mur-peint"
  | "panneau"
  | "pavillon"
  | "personne"
  | "potelet"
  | "poubelles"
  | "rampe"
  | "scene"
  | "stand"
  | "table"
  | "velo"
  | "voiture";

/** Un objet de l'aménagement, en mètres. x suit la rue, z la traverse. */
export type Element = { modele: Modele; x: number; z: number; angle?: number; longueur?: number; largeur?: number; couleur?: number };

export type Scenario = { id: string; resume: string; rayon: number; elements: Element[] };

type Definition = { id: string; mots: RegExp; resume: string; elements: Element[] };

const VERT_PISTE = 0x2f8f5b;
const GRIS_CLAIR = 0xd8d4c8;
const BLANC = 0xf4f4f0;
const HERBE = 0x5f9a46;
const SOL_SPORT = 0x2a6fa8;

function rangee(modele: Modele, nombre: number, pas: number, z = 0, angle = 0): Element[] {
  return Array.from({ length: nombre }, (_, i) => ({ modele, x: (i - (nombre - 1) / 2) * pas, z, angle }));
}

/** Découpée en tronçons : ceux qui tomberaient dans un bâtiment sont retirés un par un. */
function bande(longueur: number, largeur: number, couleur: number, z = 0): Element[] {
  const nombre = Math.ceil(longueur / 5);
  return rangee("bande", nombre, 5, z).map((e) => ({ ...e, longueur: 5.05, largeur, couleur }));
}

function personnes(...points: [number, number][]): Element[] {
  return points.map(([x, z], i) => ({ modele: "personne", x, z, angle: i * 1.7 }));
}

function grille(modele: Modele, colonnes: number, lignes: number, pas: number): Element[] {
  return Array.from({ length: colonnes * lignes }, (_, i) => {
    const colonne = i % colonnes;
    const ligne = Math.floor(i / colonnes);
    return {
      modele,
      // Un léger décalage alterné évite l'effet de quadrillage.
      x: (colonne - (colonnes - 1) / 2) * pas + (ligne % 2) * (pas / 3),
      z: (ligne - (lignes - 1) / 2) * pas,
    };
  });
}

/** Testés dans l'ordre : le plus précis d'abord (« boîte à livres près de l'arrêt » n'est pas un arrêt). */
const SCENARIOS: Definition[] = [
  {
    id: "piste",
    mots: /piste|cyclable/,
    resume: "Une voie cyclable verte séparée par des potelets, avec des cyclistes.",
    elements: [
      ...bande(60, 3, VERT_PISTE),
      ...rangee("potelet", 11, 6, 1.9),
      { modele: "cycliste", x: -12, z: -0.6, angle: Math.PI / 2 },
      { modele: "cycliste", x: 8, z: 0.6, angle: -Math.PI / 2 },
    ],
  },
  {
    id: "recharge",
    mots: /recharge/,
    resume: "Des bornes de recharge sous un abri, avec des arceaux pour attacher les vélos.",
    elements: [
      { modele: "abri-velo", x: 0, z: -1 },
      ...rangee("borne", 3, 2.4, 1.4),
      ...rangee("arceau", 5, 1.4, -1),
      ...rangee("velo", 3, 2.8, -1, Math.PI / 2),
      ...personnes([4, 3]),
    ],
  },
  {
    id: "velos",
    mots: /arceau|velo/,
    resume: "Une rangée d'arceaux et un abri couvert pour garer les vélos en sécurité.",
    elements: [
      { modele: "abri-velo", x: -3, z: -1 },
      ...rangee("arceau", 8, 1.4, 0),
      ...rangee("velo", 4, 2.8, 0, Math.PI / 2),
      ...personnes([6, 3], [-7, 3]),
    ],
  },
  {
    id: "covoiturage",
    mots: /covoiturage/,
    resume: "Des places marquées pour se retrouver et partager sa voiture, avec un panneau d'information.",
    elements: [
      ...bande(25, 11, 0x55585c),
      ...rangee("bande", 6, 3.5, 0).map((e) => ({ ...e, longueur: 0.15, largeur: 5, couleur: BLANC, z: -2.5 })),
      { modele: "voiture", x: -5.2, z: -2.5, angle: Math.PI / 2 },
      { modele: "voiture", x: 1.8, z: -2.5, angle: Math.PI / 2 },
      { modele: "panneau", x: 9, z: 4 },
      { modele: "banc", x: 3, z: 4.5 },
      ...personnes([-2, 3], [-1, 4]),
    ],
  },
  {
    id: "traversee",
    mots: /passage pieton|traversee|securiser/,
    resume: "Un passage piéton surélevé et bien signalé, encadré de panneaux et d'éclairage.",
    elements: [
      ...bande(15, 7, 0xa54b3e),
      ...rangee("bande", 7, 1.2, 0).map((e) => ({ ...e, longueur: 0.6, largeur: 5, couleur: BLANC })),
      { modele: "panneau", x: -6, z: 4.5 },
      { modele: "panneau", x: 6, z: -4.5 },
      { modele: "lampadaire", x: -6.8, z: -4.5 },
      { modele: "lampadaire", x: 6.8, z: 4.5 },
      ...personnes([-1, 1], [1.5, -1.5], [0, 4.5]),
    ],
  },
  {
    id: "trottoir",
    mots: /trottoir|poussette/,
    resume: "Un trottoir élargi et sans obstacle, où poussettes et fauteuils se croisent facilement.",
    elements: [...bande(40, 3.5, GRIS_CLAIR), ...rangee("jardiniere", 4, 9, 2.4), ...personnes([-8, 0.5], [-6.5, -0.6], [5, 0])],
  },
  {
    id: "livres",
    mots: /boite a livres|lecture/,
    resume: "Une petite bibliothèque en libre accès, abritée de la pluie, avec un banc pour lire.",
    elements: [
      { modele: "boite-livres", x: 0, z: 0 },
      { modele: "banc", x: 3, z: 0.5, angle: -0.3 },
      { modele: "arbre", x: 5.5, z: -2 },
      ...personnes([-1.5, 1.6]),
    ],
  },
  {
    id: "frigo",
    mots: /frigo|refrigerateur/,
    resume: "Un réfrigérateur en libre-service, sous un petit abri entretenu par des bénévoles.",
    elements: [{ modele: "frigo", x: 0, z: 0 }, { modele: "panneau", x: 2.6, z: 1 }, ...personnes([-1, 2], [0.8, 2.2])],
  },
  {
    id: "tri",
    mots: /poubelle|cendrier|dechet|sacs|\btri\b/,
    resume: "Des points de tri bien visibles, faciles à repérer et à entretenir.",
    elements: [...rangee("poubelles", 3, 7, 0), { modele: "panneau", x: 2.5, z: 1.2 }, ...personnes([-3, 2])],
  },
  {
    id: "compost",
    mots: /compost/,
    resume: "Trois bacs de compost collectif, avec un panneau d'explication et un carré de plantations.",
    elements: [
      ...rangee("composteur", 3, 1.8, 0),
      { modele: "panneau", x: 3.8, z: 0.5 },
      { modele: "bac", x: -5, z: 1 },
      ...personnes([1, 2.2]),
    ],
  },
  {
    id: "jardin",
    mots: /jardin|verger|potager/,
    resume: "Des bacs à cultiver, des arbres fruitiers et une cabane à outils partagée.",
    elements: [
      ...grille("bac", 3, 2, 3.6),
      { modele: "cabane", x: -9, z: 0 },
      ...rangee("arbre", 3, 7, -6.5),
      { modele: "banc", x: 8, z: 1 },
      ...personnes([1.8, 0], [-2, 3], [4, -2.6]),
    ],
  },
  {
    id: "nichoirs",
    mots: /nichoir|insecte/,
    resume: "Un hôtel à insectes entouré d'arbres, avec un banc pour observer la faune.",
    elements: [
      { modele: "hotel-insectes", x: 0, z: 0 },
      { modele: "arbre", x: -4.5, z: -1.5 },
      { modele: "arbre", x: 4.5, z: -2 },
      { modele: "banc", x: 0, z: 3.5, angle: Math.PI },
      ...personnes([2.5, 2.6]),
    ],
  },
  {
    id: "foret",
    mots: /arbre|foret|vegetal|planter|bruit/,
    resume: "Une plantation d'arbres sur une bande de pleine terre, pour faire de l'ombre et rafraîchir le lieu.",
    elements: [...bande(30, 18, HERBE), ...grille("arbre", 5, 3, 6), ...personnes([-3, 10], [2, 10.5])],
  },
  {
    id: "bancs",
    mots: /banc|ombr|bords/,
    resume: "Des bancs à l'ombre, séparés par des arbres, pour s'asseoir le long de la promenade.",
    elements: [
      ...rangee("banc", 4, 8, 0),
      ...rangee("arbre", 3, 8, -1.6),
      ...rangee("lampadaire", 2, 22, 2),
      ...personnes([-4, 1.8], [7, 2]),
    ],
  },
  {
    id: "pietonne",
    mots: /pieton|terrasse/,
    resume: "Une rue rendue aux piétons, avec des terrasses, des jardinières et de la place pour flâner.",
    elements: [
      ...bande(40, 10, GRIS_CLAIR),
      ...rangee("table", 5, 6, -3),
      ...rangee("jardiniere", 4, 10, 4),
      ...personnes([-10, 1], [-8, 0], [-2, 2], [4, 0.5], [6, 1.5], [12, 0]),
    ],
  },
  {
    id: "parcours",
    mots: /parcours|sentier|balis/,
    resume: "Un chemin balisé avec des panneaux réguliers et des bancs pour faire une pause.",
    elements: [
      ...bande(50, 2, 0xc8a877),
      ...rangee("panneau", 4, 14, 1.8),
      ...rangee("banc", 2, 28, -2),
      ...personnes([-6, 0.3], [-4.8, -0.2]),
    ],
  },
  {
    id: "marche",
    mots: /marche/,
    resume: "Des étals de producteurs de part et d'autre d'une allée, avec les habitants qui font leurs courses.",
    elements: [
      ...rangee("stand", 4, 6, -4),
      ...rangee("stand", 4, 6, 4, Math.PI),
      ...personnes([-8, 1], [-6, -1.5], [-2, 0], [1, 1.8], [3, -1.2], [7, 0.5], [9, -1], [-4, 2]),
    ],
  },
  {
    id: "cinema",
    mots: /cinema/,
    resume: "Un écran en plein air et des rangées de bancs face à lui.",
    elements: [
      { modele: "ecran", x: 0, z: -9 },
      ...rangee("banc", 4, 3, -2),
      ...rangee("banc", 4, 3, 1),
      ...rangee("banc", 4, 3, 4),
      ...personnes([-4, 0], [1, 0], [3, 3], [-2, 3]),
    ],
  },
  {
    id: "concert",
    mots: /concert/,
    resume: "Une scène légère et du public réuni dans la rue.",
    elements: [
      { modele: "scene", x: 0, z: -7 },
      ...personnes([-5, 0], [-3, 2], [-1, 0], [1, 2], [3, 0], [5, 2], [-4, 4], [0, 4], [4, 4], [-2, -2], [2, -2]),
    ],
  },
  {
    id: "fresque",
    mots: /fresque/,
    resume: "Un grand mur peint par les habitants.",
    elements: [{ modele: "mur-peint", x: 0, z: -2 }, ...personnes([-3, 1], [2, 0.8], [4, 2])],
  },
  {
    id: "stade",
    mots: /multisport|city stade/,
    resume: "Un terrain de jeu ouvert, avec ses buts et un éclairage pour le soir.",
    elements: [
      ...bande(30, 16, SOL_SPORT),
      { modele: "but", x: -13.5, z: 0, angle: Math.PI / 2 },
      { modele: "but", x: 13.5, z: 0, angle: -Math.PI / 2 },
      { modele: "lampadaire", x: -15.5, z: 9 },
      { modele: "lampadaire", x: 15.5, z: 9 },
      ...personnes([-6, 2], [-2, -3], [3, 1], [7, -2]),
    ],
  },
  {
    id: "agres",
    mots: /agres/,
    resume: "Des agrès de sport en accès libre sur un sol souple.",
    elements: [...bande(20, 8, 0xb5533c), ...rangee("agres", 4, 4.5, 0), ...personnes([-2, 2], [3, 2.2])],
  },
  {
    id: "skate",
    mots: /skate/,
    resume: "Des modules de skate sur une dalle lisse, avec un éclairage du soir.",
    elements: [
      ...bande(25, 14, 0xb9b9b4),
      { modele: "rampe", x: -9, z: 0, angle: Math.PI / 2 },
      { modele: "rampe", x: 9, z: 0, angle: -Math.PI / 2 },
      { modele: "lampadaire", x: 0, z: 8 },
      ...personnes([-2, 2], [3, -2]),
    ],
  },
  {
    id: "arret",
    mots: /abri|navette|arret|car scolaire/,
    resume: "Un abri couvert avec un banc, et un véhicule à l'arrêt.",
    elements: [
      { modele: "abri-bus", x: 0, z: 2.5 },
      { modele: "bus", x: 0, z: -1.5 },
      { modele: "lampadaire", x: 7, z: 3 },
      ...personnes([-2, 1.4], [1.5, 1.4], [3, 2.8]),
    ],
  },
];

const LOCAL: Definition = {
  id: "local",
  mots: /$^/,
  resume: "Un petit local de quartier ouvert aux habitants, avec des bancs à l'entrée.",
  elements: [
    { modele: "pavillon", x: 0, z: -2 },
    ...rangee("banc", 2, 5, 4),
    ...rangee("arbre", 2, 16, 1),
    ...personnes([-1, 2.5], [1.2, 3], [3, 1.8]),
  ],
};

/** Quand ni le titre ni le texte ne décrivent un objet précis. */
const PAR_CATEGORIE: Record<string, string> = {
  mobilite: "velos",
  "espaces-verts": "foret",
  proprete: "tri",
  "sport-loisirs": "local",
};

function normaliser(texte: string) {
  return texte
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function rayonDe(elements: Element[]) {
  const loin = Math.max(...elements.filter((e) => e.modele !== "bande").map((e) => Math.hypot(e.x, e.z)));
  return Math.ceil(Math.min(loin + 2, 24));
}

export function choisirScenario(titre: string, description: string, categorie: string): Scenario {
  const dans = (texte: string) => SCENARIOS.find((s) => s.mots.test(normaliser(texte)));
  const { id, resume, elements } =
    dans(titre) ?? dans(description) ?? SCENARIOS.find((s) => s.id === PAR_CATEGORIE[categorie]) ?? LOCAL;
  return { id, resume, elements, rayon: rayonDe(elements) };
}
