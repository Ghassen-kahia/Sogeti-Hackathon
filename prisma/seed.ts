import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const categories = [
  { nom: "Mobilité", slug: "mobilite", couleur: "#1d6fa5" },
  { nom: "Espaces verts", slug: "espaces-verts", couleur: "#2f7d4f" },
  { nom: "Culture", slug: "culture", couleur: "#8a3fa0" },
  { nom: "Solidarité", slug: "solidarite", couleur: "#c2410c" },
  { nom: "Propreté", slug: "proprete", couleur: "#0f766e" },
  { nom: "Commerces", slug: "commerces", couleur: "#a16207" },
  { nom: "Sport & loisirs", slug: "sport-loisirs", couleur: "#b3261e" },
];

// Quartiers de démonstration : remplacez-les par les vôtres, le reste de l'appli s'adapte.
const quartiers = [
  { nom: "Centre-ville", slug: "centre-ville", ville: "Angers", latitude: 47.4712, longitude: -0.5518 },
  { nom: "La Doutre", slug: "la-doutre", ville: "Angers", latitude: 47.474, longitude: -0.559 },
  { nom: "Belle-Beille", slug: "belle-beille", ville: "Angers", latitude: 47.479, longitude: -0.601 },
  { nom: "Saint-Serge", slug: "saint-serge", ville: "Angers", latitude: 47.483, longitude: -0.546 },
  { nom: "Monplaisir", slug: "monplaisir", ville: "Angers", latitude: 47.492, longitude: -0.53 },
  { nom: "Lac de Maine", slug: "lac-de-maine", ville: "Angers", latitude: 47.456, longitude: -0.589 },
  { nom: "La Roseraie", slug: "la-roseraie", ville: "Angers", latitude: 47.448, longitude: -0.545 },
];

const voisins = ["Camille", "Sasha", "Noa", "Yanis", "Inès", "Lou", "Malik", "Jade"];

type Idee = {
  titre: string;
  description: string;
  categorie: string;
  quartier: string;
  tags: string[];
  position?: [number, number];
  auteur: string;
  /** Nombre de votes pour et contre, attribués dans l'ordre de la liste des voisins. */
  votes: [number, number];
  ilYaJours: number;
};

const idees: Idee[] = [
  {
    titre: "Une piste cyclable continue le long de la Maine",
    description:
      "Aujourd'hui la piste s'interrompt à plusieurs endroits et oblige à rejoindre la route. Une liaison continue rendrait le trajet plus sûr pour les familles et pour celles et ceux qui vont au travail à vélo.",
    categorie: "mobilite",
    quartier: "la-doutre",
    tags: ["vélo", "sécurité"],
    position: [47.4755, -0.5565],
    auteur: "Camille",
    votes: [6, 1],
    ilYaJours: 2,
  },
  {
    titre: "Un jardin partagé au pied des immeubles",
    description:
      "La pelouse derrière la place pourrait accueillir une dizaine de bacs à cultiver ensemble. Les écoles voisines pourraient y animer des ateliers au printemps.",
    categorie: "espaces-verts",
    quartier: "monplaisir",
    tags: ["jardin", "enfants", "lien social"],
    position: [47.4925, -0.5285],
    auteur: "Malik",
    votes: [7, 0],
    ilYaJours: 5,
  },
  {
    titre: "Une boîte à livres près de l'arrêt de tram",
    description:
      "Une petite bibliothèque en libre accès, à l'abri de la pluie, pour échanger des livres en attendant le tram. Elle pourrait être fabriquée avec l'atelier bois du centre social.",
    categorie: "culture",
    quartier: "belle-beille",
    tags: ["lecture", "lien social"],
    position: [47.4797, -0.5985],
    auteur: "Inès",
    votes: [5, 1],
    ilYaJours: 8,
  },
  {
    titre: "Un frigo solidaire géré par les habitants",
    description:
      "Un réfrigérateur en libre-service, entretenu par un groupe de bénévoles, pour partager les invendus des commerçants et limiter le gaspillage alimentaire.",
    categorie: "solidarite",
    quartier: "saint-serge",
    tags: ["anti-gaspi", "entraide"],
    position: [47.4822, -0.5478],
    auteur: "Lou",
    votes: [4, 2],
    ilYaJours: 11,
  },
  {
    titre: "Plus de bancs ombragés autour du lac",
    description:
      "Le tour du lac manque d'endroits où s'asseoir à l'ombre, surtout pour les personnes âgées. Quelques bancs sous les arbres existants suffiraient à rendre la promenade plus agréable l'été.",
    categorie: "espaces-verts",
    quartier: "lac-de-maine",
    tags: ["seniors", "été"],
    position: [47.4575, -0.5915],
    auteur: "Noa",
    votes: [6, 0],
    ilYaJours: 14,
  },
  {
    titre: "Rendre piétonne la rue commerçante le samedi",
    description:
      "Fermer la rue aux voitures le samedi de 10 h à 18 h laisserait de la place aux terrasses et aux étals. Les riverains garderaient un accès à leur garage.",
    categorie: "commerces",
    quartier: "centre-ville",
    tags: ["piéton", "marché"],
    position: [47.4708, -0.5525],
    auteur: "Yanis",
    votes: [4, 4],
    ilYaJours: 3,
  },
  {
    titre: "Des cendriers et poubelles de tri aux arrêts de bus",
    description:
      "Les abords des arrêts sont souvent jonchés de mégots et d'emballages. Des équipements simples et un ramassage plus régulier amélioreraient vite les choses.",
    categorie: "proprete",
    quartier: "la-roseraie",
    tags: ["tri", "mégots"],
    position: [47.4492, -0.5462],
    auteur: "Sasha",
    votes: [5, 0],
    ilYaJours: 6,
  },
  {
    titre: "Un terrain multisport ouvert en soirée",
    description:
      "Le terrain ferme à 18 h alors que beaucoup de jeunes finissent les cours ou le travail à cette heure-là. Un éclairage avec minuterie permettrait de l'ouvrir jusqu'à 21 h.",
    categorie: "sport-loisirs",
    quartier: "belle-beille",
    tags: ["jeunes", "éclairage"],
    auteur: "Jade",
    votes: [3, 3],
    ilYaJours: 1,
  },
  {
    titre: "Un concert de quartier chaque premier dimanche",
    description:
      "Inviter les musiciennes et musiciens amateurs du quartier à jouer sur la place, une fois par mois, avec une scène légère installée par les habitants.",
    categorie: "culture",
    quartier: "la-doutre",
    tags: ["musique", "lien social"],
    position: [47.4733, -0.5602],
    auteur: "Sasha",
    votes: [5, 2],
    ilYaJours: 18,
  },
  {
    titre: "Des arceaux à vélos devant l'école",
    description:
      "Les parents attachent leurs vélos aux grilles faute de place. Une dizaine d'arceaux abrités encouragerait les trajets à vélo et dégagerait le trottoir.",
    categorie: "mobilite",
    quartier: "la-roseraie",
    tags: ["vélo", "enfants"],
    position: [47.4471, -0.5436],
    auteur: "Camille",
    votes: [6, 1],
    ilYaJours: 21,
  },
];

function joursAvant(jours: number) {
  return new Date(Date.now() - jours * 24 * 60 * 60 * 1000);
}

async function main() {
  for (const c of categories) {
    await prisma.categorie.upsert({ where: { slug: c.slug }, update: c, create: c });
  }
  for (const q of quartiers) {
    await prisma.localisation.upsert({ where: { slug: q.slug }, update: q, create: q });
  }

  // Les idées de démo ne sont ajoutées qu'à une base vide, pour ne jamais doubler de vraies données.
  if ((await prisma.suggestion.count()) > 0) {
    console.log("Référentiels à jour. Des idées existent déjà : données de démo ignorées.");
    return;
  }

  const ids = new Map<string, number>();
  for (const nickname of voisins) {
    const nicknameKey = nickname.toLowerCase();
    const user = await prisma.user.upsert({
      where: { nicknameKey },
      update: {},
      create: { nickname, nicknameKey },
    });
    ids.set(nickname, user.id);
  }

  for (const idee of idees) {
    const [pour, contre] = idee.votes;
    const suggestion = await prisma.suggestion.create({
      data: {
        titre: idee.titre,
        description: idee.description,
        latitude: idee.position?.[0],
        longitude: idee.position?.[1],
        votesPour: pour,
        votesContre: contre,
        score: pour - contre,
        createdAt: joursAvant(idee.ilYaJours),
        auteur: { connect: { id: ids.get(idee.auteur)! } },
        categorie: { connect: { slug: idee.categorie } },
        localisation: { connect: { slug: idee.quartier } },
        tags: {
          connectOrCreate: idee.tags.map((nom) => ({ where: { nom }, create: { nom } })),
        },
      },
    });

    await prisma.vote.createMany({
      data: voisins.slice(0, pour + contre).map((nickname, i) => ({
        userId: ids.get(nickname)!,
        suggestionId: suggestion.id,
        valeur: i < pour ? 1 : -1,
      })),
    });
  }

  console.log(`${idees.length} idées de démonstration ajoutées.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
