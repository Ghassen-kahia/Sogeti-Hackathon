"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { fermerSession, getUtilisateur, ouvrirSession } from "@/lib/session";
import { enregistrerFichiers, preparerFichiers, supprimerFichiers } from "@/lib/uploads";
import {
  cheminSur,
  schemaPseudo,
  schemaSuggestion,
  type EtatConnexion,
  type EtatSuggestion,
} from "@/lib/validation";

export async function seConnecter(_etat: EtatConnexion, formData: FormData): Promise<EtatConnexion> {
  const resultat = schemaPseudo.safeParse(formData.get("nickname"));
  if (!resultat.success) return { erreur: resultat.error.issues[0].message };

  const nickname = resultat.data;
  const nicknameKey = nickname.toLowerCase();
  const user = await prisma.user.upsert({
    where: { nicknameKey },
    update: {},
    create: { nickname, nicknameKey },
    select: { id: true },
  });

  await ouvrirSession(user.id);
  revalidatePath("/", "layout");
  redirect(cheminSur(formData.get("next")));
}

export async function seDeconnecter() {
  await fermerSession();
  revalidatePath("/", "layout");
  redirect("/");
}

export type ResultatVote = { statut: "ok" | "non-connecte" | "erreur" };

/** Voter deux fois de la même façon retire le vote ; voter à l'inverse le remplace. */
export async function voter(suggestionId: number, valeur: 1 | -1): Promise<ResultatVote> {
  if (!Number.isInteger(suggestionId) || (valeur !== 1 && valeur !== -1)) return { statut: "erreur" };

  const user = await getUtilisateur();
  if (!user) return { statut: "non-connecte" };

  const cle = { userId_suggestionId: { userId: user.id, suggestionId } };
  try {
    await prisma.$transaction(async (tx) => {
      const existant = await tx.vote.findUnique({ where: cle });
      let pour = 0;
      let contre = 0;

      if (existant?.valeur === valeur) {
        await tx.vote.delete({ where: cle });
        if (valeur === 1) pour = -1;
        else contre = -1;
      } else if (existant) {
        await tx.vote.update({ where: cle, data: { valeur } });
        pour = valeur;
        contre = -valeur;
      } else {
        await tx.vote.create({ data: { userId: user.id, suggestionId, valeur } });
        if (valeur === 1) pour = 1;
        else contre = 1;
      }

      await tx.suggestion.update({
        where: { id: suggestionId },
        data: {
          votesPour: { increment: pour },
          votesContre: { increment: contre },
          score: { increment: pour - contre },
        },
      });
    });
  } catch (e) {
    // Double clic concurrent ou idée disparue : la transaction est annulée, les compteurs restent justes.
    if (e instanceof Prisma.PrismaClientKnownRequestError) return { statut: "erreur" };
    throw e;
  }

  revalidatePath("/", "layout");
  return { statut: "ok" };
}

function lireTags(formData: FormData) {
  const tags = formData.getAll("tags").map((t) => String(t).trim().toLowerCase());
  return [...new Set(tags.filter(Boolean))];
}

export async function creerSuggestion(formData: FormData): Promise<EtatSuggestion> {
  const user = await getUtilisateur();
  if (!user) redirect("/connexion?next=/idees/nouvelle");

  const resultat = schemaSuggestion.safeParse({
    titre: formData.get("titre"),
    description: formData.get("description"),
    categorieId: formData.get("categorieId"),
    localisationId: formData.get("localisationId"),
    tags: lireTags(formData),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  });

  const fichiers = await preparerFichiers(formData.getAll("fichiers").filter((f) => f instanceof File));

  if (!resultat.success || typeof fichiers === "string") {
    const erreurs: NonNullable<EtatSuggestion["erreurs"]> = {};
    for (const issue of resultat.error?.issues ?? []) {
      const champ = issue.path[0] as keyof typeof erreurs;
      erreurs[champ] ??= issue.message;
    }
    if (typeof fichiers === "string") erreurs.fichiers = fichiers;
    return { erreurs };
  }

  const { tags, ...donnees } = resultat.data;
  try {
    await enregistrerFichiers(fichiers);
    const suggestion = await prisma.suggestion.create({
      data: {
        ...donnees,
        auteurId: user.id,
        tags: {
          connectOrCreate: tags.map((nom) => ({ where: { nom }, create: { nom } })),
        },
        piecesJointes: {
          create: fichiers.map(({ nomOriginal, nomStockage, typeMime, taille }) => ({
            nomOriginal,
            nomStockage,
            typeMime,
            taille,
          })),
        },
      },
      select: { id: true },
    });
    revalidatePath("/", "layout");
    return { id: suggestion.id };
  } catch (e) {
    await supprimerFichiers(fichiers);
    console.error("Création de suggestion impossible", e);
    return { erreur: "Votre idée n'a pas pu être enregistrée. Réessayez dans un instant." };
  }
}
