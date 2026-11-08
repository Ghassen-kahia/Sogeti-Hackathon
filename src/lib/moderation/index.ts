import "server-only";
import { prisma } from "@/lib/db";
import { analyserAvecIa } from "@/lib/moderation/ia";
import { analyserTexte, trouverDoublon, type Contenu, type Gravite, type Motif } from "@/lib/moderation/regles";

const MAX_COMPARAISONS = 500;

export type Analyse = { gravite: Gravite; motifs: Motif[]; source: "regles" | "ia" };

/**
 * Chaîne de modération d'une nouvelle idée :
 *  - "bloque" : refusée au formulaire, l'auteur peut corriger, rien n'est enregistré ni envoyé à l'IA ;
 *  - "doute"  : enregistrée, mais invisible jusqu'à la décision d'un modérateur ;
 *  - "ok"     : publiée immédiatement.
 */
export async function analyserIdee(contenu: Contenu): Promise<Analyse> {
  const { gravite, motifs } = analyserTexte(contenu);
  if (gravite === "bloque") return { gravite, motifs, source: "regles" };

  const existantes = await prisma.suggestion.findMany({
    where: { statut: "PUBLIEE" },
    orderBy: { createdAt: "desc" },
    take: MAX_COMPARAISONS,
    select: { id: true, titre: true, description: true },
  });
  const doublon = trouverDoublon(contenu, existantes);
  if (doublon) {
    motifs.push({ code: "doublon", message: `Très proche de l'idée n°${doublon.id} « ${doublon.titre} ».` });
  }
  if (motifs.length > 0) return { gravite: "doute", motifs, source: "regles" };

  const motifsIa = await analyserAvecIa(contenu);
  if (motifsIa === null) return { gravite: "ok", motifs: [], source: "regles" };
  return { gravite: motifsIa.length > 0 ? "doute" : "ok", motifs: motifsIa, source: "ia" };
}
