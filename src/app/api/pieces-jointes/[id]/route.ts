import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { lireFichier } from "@/lib/uploads";

export async function GET(_requete: Request, contexte: RouteContext<"/api/pieces-jointes/[id]">) {
  await connection();
  const id = Number((await contexte.params).id);
  if (!Number.isInteger(id)) return new Response("Introuvable", { status: 404 });

  const piece = await prisma.pieceJointe.findUnique({ where: { id } });
  if (!piece) return new Response("Introuvable", { status: 404 });

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
