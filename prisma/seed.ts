import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type StatutModeration } from "../src/generated/prisma/client";

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

type Idee = {
  titre: string;
  description: string;
  categorie: string;
  quartier: string;
  tags: string[];
  likes: number;
  ilYaJours: number;
  sansPosition?: boolean;
  statut?: StatutModeration;
  analyseePar?: string;
  motifs?: string[];
  noteModeration?: string;
  signalements?: string[];
};

type JeuDeDonnees = {
  quartiers: { nom: string; slug: string; ville: string; latitude: number; longitude: number }[];
  voisins: string[];
  idees: Idee[];
};

// Pour changer de territoire, il suffit de remplacer ce fichier.
const { quartiers, voisins, idees }: JeuDeDonnees = JSON.parse(
  readFileSync("prisma/donnees/idees-dijon.json", "utf8"),
);

function joursAvant(jours: number) {
  return new Date(Date.now() - jours * 24 * 60 * 60 * 1000);
}

/** Écart fixe autour du centre du quartier : les épingles ne s'empilent pas et restent les mêmes à chaque seed. */
function position(index: number, quartier: { latitude: number; longitude: number }) {
  return {
    latitude: quartier.latitude + 0.002 * Math.sin(index * 12.9898),
    longitude: quartier.longitude + 0.003 * Math.cos(index * 78.233),
  };
}

async function viderLaBase() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("--reset est refusé en production : il efface toutes les données.");
  }
  // RESTART IDENTITY : les motifs de la démo citent des idées par leur numéro, qui doit repartir de 1.
  await prisma.$executeRaw`TRUNCATE TABLE users, categories, localisations, tags RESTART IDENTITY CASCADE`;
}

async function main() {
  if (process.argv.includes("--reset")) await viderLaBase();

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

  const ids: number[] = [];
  for (const nickname of voisins) {
    const nicknameKey = nickname.toLowerCase();
    const user = await prisma.user.upsert({
      where: { nicknameKey },
      update: {},
      create: { nickname, nicknameKey },
    });
    ids.push(user.id);
  }

  const parSlug = new Map(quartiers.map((q) => [q.slug, q]));

  for (const [index, idee] of idees.entries()) {
    const quartier = parSlug.get(idee.quartier);
    if (!quartier) throw new Error(`Quartier inconnu dans le jeu de données : ${idee.quartier}`);
    if (idee.likes > ids.length) throw new Error(`Trop de j'aime pour « ${idee.titre} ».`);

    const creeLe = joursAvant(idee.ilYaJours);
    const suggestion = await prisma.suggestion.create({
      data: {
        titre: idee.titre,
        description: idee.description,
        ...(!idee.sansPosition && position(index, quartier)),
        likes: idee.likes,
        createdAt: creeLe,
        statut: idee.statut ?? "PUBLIEE",
        motifsModeration: idee.motifs ?? [],
        analyseePar: idee.analyseePar ?? "regles",
        noteModeration: idee.noteModeration,
        moderatedAt: idee.statut === "REJETEE" ? creeLe : undefined,
        auteur: { connect: { id: ids[index % ids.length] } },
        categorie: { connect: { slug: idee.categorie } },
        localisation: { connect: { slug: idee.quartier } },
        tags: {
          connectOrCreate: idee.tags.map((nom) => ({ where: { nom }, create: { nom } })),
        },
      },
    });

    // Les votants tournent d'une idée à l'autre, pour que personne ne vote partout.
    const votant = (rang: number) => ids[(index + rang) % ids.length];
    await prisma.vote.createMany({
      data: Array.from({ length: idee.likes }, (_, rang) => ({ userId: votant(rang), suggestionId: suggestion.id })),
    });

    await prisma.signalement.createMany({
      data: (idee.signalements ?? []).map((motif, rang) => ({
        userId: votant(rang + 1),
        suggestionId: suggestion.id,
        motif,
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
