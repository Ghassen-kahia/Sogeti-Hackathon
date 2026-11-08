"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { analyserIdee } from "@/lib/moderation";
import { pseudoInacceptable } from "@/lib/moderation/regles";
import {
  codeModerationValide,
  estModerateur,
  fermerSession,
  fermerSessionModeration,
  getUtilisateur,
  ouvrirSession,
  ouvrirSessionModeration,
} from "@/lib/session";
import { enregistrerFichiers, preparerFichiers, supprimerFichiers } from "@/lib/uploads";
import {
  cheminSur,
  estIdValide,
  MOTIFS_SIGNALEMENT,
  schemaDecision,
  schemaPseudo,
  schemaSuggestion,
  SEUIL_SIGNALEMENTS,
  type MotifSignalement,
  type EtatConnexion,
  type EtatSuggestion,
} from "@/lib/validation";

export async function seConnecter(_etat: EtatConnexion, formData: FormData): Promise<EtatConnexion> {
  const resultat = schemaPseudo.safeParse(formData.get("nickname"));
  if (!resultat.success) return { erreur: resultat.error.issues[0].message };

  const nickname = resultat.data;
  if (pseudoInacceptable(nickname)) return { erreur: "Ce pseudo n'est pas acceptable. Choisissez-en un autre." };

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

export type ResultatJaime = { statut: "ok" | "non-connecte" | "erreur" };

/** Un second clic retire le j'aime. */
export async function basculerJaime(suggestionId: number): Promise<ResultatJaime> {
  if (!estIdValide(suggestionId)) return { statut: "erreur" };

  const user = await getUtilisateur();
  if (!user) return { statut: "non-connecte" };

  const idee = await prisma.suggestion.findUnique({ where: { id: suggestionId }, select: { statut: true } });
  if (idee?.statut !== "PUBLIEE") return { statut: "erreur" };

  const cle = { userId_suggestionId: { userId: user.id, suggestionId } };
  try {
    await prisma.$transaction(async (tx) => {
      const existant = await tx.vote.findUnique({ where: cle });
      if (existant) await tx.vote.delete({ where: cle });
      else await tx.vote.create({ data: { userId: user.id, suggestionId } });

      await tx.suggestion.update({
        where: { id: suggestionId },
        data: { likes: { increment: existant ? -1 : 1 } },
      });
    });
  } catch (e) {
    // Double clic concurrent ou idée disparue : la transaction est annulée, le compteur reste juste.
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
      // Latitude et longitude partagent un seul message dans le formulaire.
      const champ = (issue.path[0] === "longitude" ? "latitude" : issue.path[0]) as keyof typeof erreurs;
      erreurs[champ] ??= issue.message;
    }
    if (typeof fichiers === "string") erreurs.fichiers = fichiers;
    return { erreurs };
  }

  const { tags, ...donnees } = resultat.data;

  const analyse = await analyserIdee({ titre: donnees.titre, description: donnees.description, tags });
  if (analyse.gravite === "bloque") return { refus: analyse.motifs.map((m) => m.message) };

  try {
    await enregistrerFichiers(fichiers);
    const suggestion = await prisma.suggestion.create({
      data: {
        ...donnees,
        auteurId: user.id,
        statut: analyse.gravite === "doute" ? "EN_ATTENTE" : "PUBLIEE",
        motifsModeration: analyse.motifs.map((m) => m.message),
        analyseePar: analyse.source,
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

export type ResultatSignalement = { statut: "ok" | "deja" | "non-connecte" | "erreur" };

/** Au-delà du seuil, l'idée est retirée de la vue de tous en attendant qu'un modérateur la lise. */
export async function signaler(suggestionId: number, motif: MotifSignalement): Promise<ResultatSignalement> {
  if (!estIdValide(suggestionId) || !Object.hasOwn(MOTIFS_SIGNALEMENT, motif)) return { statut: "erreur" };

  const user = await getUtilisateur();
  if (!user) return { statut: "non-connecte" };

  const idee = await prisma.suggestion.findUnique({
    where: { id: suggestionId },
    select: { statut: true, moderatedAt: true },
  });
  if (idee?.statut !== "PUBLIEE") return { statut: "erreur" };

  try {
    await prisma.signalement.create({ data: { userId: user.id, suggestionId, motif } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { statut: "deja" };
    throw e;
  }

  // Une idée validée par un modérateur ne repart en file que sur de nouveaux signalements.
  const nombre = await prisma.signalement.count({
    where: { suggestionId, createdAt: { gt: idee.moderatedAt ?? new Date(0) } },
  });
  if (nombre >= SEUIL_SIGNALEMENTS) {
    await prisma.suggestion.updateMany({
      where: { id: suggestionId, statut: "PUBLIEE" },
      data: {
        statut: "EN_ATTENTE",
        analyseePar: "signalements",
        motifsModeration: [`${nombre} signalements d'habitants.`],
      },
    });
    revalidatePath("/", "layout");
  }
  return { statut: "ok" };
}

export async function connecterModeration(_etat: EtatConnexion, formData: FormData): Promise<EtatConnexion> {
  if (!codeModerationValide(String(formData.get("code") ?? ""))) return { erreur: "Ce code n'est pas valide." };

  await ouvrirSessionModeration();
  revalidatePath("/", "layout");
  redirect("/moderation");
}

export async function deconnecterModeration() {
  await fermerSessionModeration();
  revalidatePath("/", "layout");
  redirect("/");
}

const NOTE_PAR_DEFAUT = "Cette idée ne respecte pas les règles de la plateforme.";

export async function deciderModeration(formData: FormData) {
  if (!(await estModerateur())) redirect("/moderation");

  const resultat = schemaDecision.safeParse({
    id: formData.get("id"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? undefined,
  });
  if (!resultat.success) return;

  const { id, decision, note } = resultat.data;
  await prisma.suggestion.updateMany({
    where: { id },
    data: {
      statut: decision,
      moderatedAt: new Date(),
      noteModeration: decision === "REJETEE" ? note || NOTE_PAR_DEFAUT : null,
    },
  });
  revalidatePath("/", "layout");
}
