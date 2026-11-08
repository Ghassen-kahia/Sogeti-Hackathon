import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { estModerateur, getUtilisateur } from "@/lib/session";
import { lireFichier } from "@/lib/uploads";
import { estIdValide } from "@/lib/validation";

export async function GET(_requete: Request, contexte: RouteContext<"/api/pieces-jointes/[id]">) {
  await connection();
  const id = Number((await contexte.params).id);
  if (!estIdValide(id)) return new Response("Introuvable", { status: 404 });

  const piece = await prisma.pieceJointe.findUnique({
    where: { id },
    include: { suggestion: { select: { statut: true, auteurId: true } } },
  });
  if (!piece) return new Response("Introuvable", { status: 404 });

  // Le document d'une idée écartée reste privé, comme l'idée elle-même.
  if (piece.suggestion.statut !== "PUBLIEE") {
    const [moderateur, utilisateur] = await Promise.all([estModerateur(), getUtilisateur()]);
    if (!moderateur && utilisateur?.id !== piece.suggestion.auteurId) {
      return new Response("Introuvable", { status: 404 });
    }
  }

  let contenu: Buffer;
  try {
    contenu = await lireFichier(piece.nomStockage);
  } catch {
    return new Response("Fichier manquant", { status: 404 });
  }

  const estImage = piece.typeMime.startsWith("image/");
  const disposition = estImage ? "inline" : "attachment";
  return new Response(new Uint8Array(contenu), {
    headers: {
      "Content-Type": piece.typeMime,
      "Content-Length": String(contenu.length),
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(piece.nomOriginal)}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
