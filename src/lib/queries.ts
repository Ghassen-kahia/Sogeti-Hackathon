import "server-only";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export const PAR_PAGE = 12;
const MAX_EPINGLES = 300;
// Au-delà, le décalage SQL déborderait : la page demandée n'existe de toute façon pas.
const MAX_PAGE = 1_000_000;

export type Filtres = {
  q: string;
  quartier: string;
  categorie: string;
  tag: string;
  tri: "recentes" | "plus-aimees";
  vue: "fiches" | "carte";
  page: number;
};

type ParamsUrl = Record<string, string | string[] | undefined>;

// PostgreSQL refuse le caractère NUL dans un texte : la requête échouerait et la page avec elle.
const texte = (v: string | string[] | undefined) =>
  typeof v === "string" ? v.replaceAll("\0", "").trim().slice(0, 100) : "";

export function lireFiltres(params: ParamsUrl): Filtres {
  const page = Number(texte(params.page));
  return {
    q: texte(params.q),
    quartier: texte(params.quartier),
    categorie: texte(params.categorie),
    tag: texte(params.tag),
    tri: params.tri === "plus-aimees" ? "plus-aimees" : "recentes",
    vue: params.vue === "carte" ? "carte" : "fiches",
    page: Number.isInteger(page) && page > 0 && page <= MAX_PAGE ? page : 1,
  };
}

function clauseWhere(f: Filtres): Prisma.SuggestionWhereInput {
  return {
    statut: "PUBLIEE",
    ...(f.quartier && { localisation: { slug: f.quartier } }),
    ...(f.categorie && { categorie: { slug: f.categorie } }),
    ...(f.tag && { tags: { some: { nom: f.tag } } }),
    ...(f.q && {
      OR: [
        { titre: { contains: f.q, mode: "insensitive" } },
        { description: { contains: f.q, mode: "insensitive" } },
      ],
    }),
  };
}

const champsCarte = {
  id: true,
  titre: true,
  description: true,
  likes: true,
  createdAt: true,
  auteur: { select: { nickname: true } },
  categorie: { select: { nom: true, slug: true, couleur: true } },
  localisation: { select: { nom: true } },
  tags: { select: { nom: true }, orderBy: { nom: "asc" } },
  _count: { select: { piecesJointes: true } },
} satisfies Prisma.SuggestionSelect;

export async function listerSuggestions(f: Filtres) {
  await connection();
  const where = clauseWhere(f);
  const orderBy: Prisma.SuggestionOrderByWithRelationInput[] =
    f.tri === "plus-aimees" ? [{ likes: "desc" }, { createdAt: "desc" }] : [{ createdAt: "desc" }];

  const [suggestions, total] = await Promise.all([
    prisma.suggestion.findMany({
      where,
      orderBy,
      take: PAR_PAGE,
      skip: (f.page - 1) * PAR_PAGE,
      select: champsCarte,
    }),
    prisma.suggestion.count({ where }),
  ]);
  return { suggestions, total, pages: Math.max(1, Math.ceil(total / PAR_PAGE)) };
}

export type SuggestionListee = Awaited<ReturnType<typeof listerSuggestions>>["suggestions"][number];

/** Toutes les idées filtrées qui ont une position, pas seulement celles de la page courante. */
export async function listerEpingles(f: Filtres) {
  await connection();
  const lignes = await prisma.suggestion.findMany({
    where: { ...clauseWhere(f), latitude: { not: null }, longitude: { not: null } },
    orderBy: { likes: "desc" },
    take: MAX_EPINGLES,
    select: {
      id: true,
      titre: true,
      latitude: true,
      longitude: true,
      likes: true,
      categorie: { select: { nom: true, slug: true, couleur: true } },
    },
  });
  return lignes.map((l) => ({
    id: l.id,
    titre: l.titre,
    latitude: l.latitude as number,
    longitude: l.longitude as number,
    likes: l.likes,
    categorie: l.categorie.nom,
    slug: l.categorie.slug,
    couleur: l.categorie.couleur,
  }));
}

export async function getSuggestion(id: number) {
  await connection();
  return prisma.suggestion.findUnique({
    where: { id },
    select: {
      ...champsCarte,
      localisation: { select: { nom: true, latitude: true, longitude: true } },
      latitude: true,
      longitude: true,
      auteurId: true,
      statut: true,
      noteModeration: true,
      piecesJointes: {
        select: { id: true, nomOriginal: true, typeMime: true, taille: true },
        orderBy: { id: "asc" },
      },
    },
  });
}

export async function getReferentiels() {
  await connection();
  const [categories, localisations, tags] = await Promise.all([
    prisma.categorie.findMany({ orderBy: { nom: "asc" } }),
    prisma.localisation.findMany({ orderBy: { nom: "asc" } }),
    // Un tag n'apparaît qu'avec une idée publiée : une idée écartée ne doit pas s'afficher par ses tags.
    prisma.tag.findMany({ where: { suggestions: { some: { statut: "PUBLIEE" } } }, orderBy: { nom: "asc" } }),
  ]);
  return { categories, localisations, tags };
}

export async function getStatistiques() {
  await connection();
  const [idees, votes, voisins] = await Promise.all([
    prisma.suggestion.count({ where: { statut: "PUBLIEE" } }),
    prisma.vote.count({ where: { suggestion: { statut: "PUBLIEE" } } }),
    prisma.user.count(),
  ]);
  return { idees, votes, voisins };
}

const champsModeration = {
  id: true,
  titre: true,
  description: true,
  createdAt: true,
  statut: true,
  motifsModeration: true,
  analyseePar: true,
  noteModeration: true,
  moderatedAt: true,
  auteur: { select: { nickname: true } },
  categorie: { select: { nom: true, slug: true, couleur: true } },
  localisation: { select: { nom: true } },
  tags: { select: { nom: true }, orderBy: { nom: "asc" } },
  piecesJointes: { select: { id: true, nomOriginal: true }, orderBy: { id: "asc" } },
  signalements: { select: { motif: true } },
} satisfies Prisma.SuggestionSelect;

export type IdeeModeration = Prisma.SuggestionGetPayload<{ select: typeof champsModeration }>;

const MAX_DECISIONS = 10;

export async function getTableauModeration() {
  await connection();
  const [file, rejetees, publiees, enAttente, totalRejetees, signalements] = await Promise.all([
    prisma.suggestion.findMany({
      where: { statut: "EN_ATTENTE" },
      orderBy: { createdAt: "asc" },
      select: champsModeration,
    }),
    prisma.suggestion.findMany({
      where: { statut: "REJETEE" },
      orderBy: { moderatedAt: "desc" },
      take: MAX_DECISIONS,
      select: champsModeration,
    }),
    prisma.suggestion.count({ where: { statut: "PUBLIEE" } }),
    prisma.suggestion.count({ where: { statut: "EN_ATTENTE" } }),
    prisma.suggestion.count({ where: { statut: "REJETEE" } }),
    prisma.signalement.count(),
  ]);
  return { file, rejetees, compteurs: { enAttente, publiees, rejetees: totalRejetees, signalements } };
}

export async function compterFileModeration() {
  return prisma.suggestion.count({ where: { statut: "EN_ATTENTE" } });
}

/** Parmi les idées données, celles que l'utilisateur aime. */
export async function getMesLikes(userId: number | undefined, ids: number[]) {
  if (!userId || ids.length === 0) return new Set<number>();
  const votes = await prisma.vote.findMany({
    where: { userId, suggestionId: { in: ids } },
    select: { suggestionId: true },
  });
  return new Set(votes.map((v) => v.suggestionId));
}
