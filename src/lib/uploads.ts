import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { MAX_FICHIERS, TAILLE_MAX_FICHIER } from "@/lib/validation";

// Hors de /public : les fichiers passent toujours par la route qui fixe les bons en-têtes.
const DOSSIER = path.join(process.cwd(), "uploads");

type Format = { mime: string; extension: string; reconnait: (o: Buffer, nom: string) => boolean };

const commencePar = (o: Buffer, ...octets: number[]) => octets.every((b, i) => o[i] === b);

// Le type est déduit du contenu : ni l'extension seule ni le type annoncé par le navigateur ne sont fiables.
const FORMATS: Format[] = [
  { mime: "application/pdf", extension: "pdf", reconnait: (o) => commencePar(o, 0x25, 0x50, 0x44, 0x46) },
  { mime: "image/png", extension: "png", reconnait: (o) => commencePar(o, 0x89, 0x50, 0x4e, 0x47) },
  { mime: "image/jpeg", extension: "jpg", reconnait: (o) => commencePar(o, 0xff, 0xd8, 0xff) },
  {
    mime: "image/webp",
    extension: "webp",
    reconnait: (o) => commencePar(o, 0x52, 0x49, 0x46, 0x46) && o.subarray(8, 12).toString("latin1") === "WEBP",
  },
  {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: "docx",
    reconnait: (o, nom) => commencePar(o, 0x50, 0x4b, 0x03, 0x04) && nom.toLowerCase().endsWith(".docx"),
  },
];

export type FichierPrepare = {
  nomOriginal: string;
  nomStockage: string;
  typeMime: string;
  taille: number;
  contenu: Buffer;
};

/** Valide les fichiers envoyés. Renvoie un message d'erreur si l'un d'eux est refusé. */
export async function preparerFichiers(fichiers: File[]): Promise<FichierPrepare[] | string> {
  const envoyes = fichiers.filter((f) => f.size > 0);
  if (envoyes.length > MAX_FICHIERS) return `${MAX_FICHIERS} fichiers maximum.`;

  const prepares: FichierPrepare[] = [];
  for (const fichier of envoyes) {
    if (fichier.size > TAILLE_MAX_FICHIER) return `« ${fichier.name} » dépasse 5 Mo.`;

    const contenu = Buffer.from(await fichier.arrayBuffer());
    const format = FORMATS.find((f) => f.reconnait(contenu, fichier.name));
    if (!format) return `« ${fichier.name} » n'est pas accepté (PDF, PNG, JPG, WebP ou DOCX).`;

    prepares.push({
      nomOriginal: path.basename(fichier.name).slice(0, 255),
      nomStockage: `${randomUUID()}.${format.extension}`,
      typeMime: format.mime,
      taille: fichier.size,
      contenu,
    });
  }
  return prepares;
}

export async function enregistrerFichiers(fichiers: FichierPrepare[]) {
  if (fichiers.length === 0) return;
  await mkdir(DOSSIER, { recursive: true });
  await Promise.all(fichiers.map((f) => writeFile(path.join(DOSSIER, f.nomStockage), f.contenu)));
}

export async function supprimerFichiers(fichiers: FichierPrepare[]) {
  await Promise.allSettled(fichiers.map((f) => unlink(path.join(DOSSIER, f.nomStockage))));
}

export function lireFichier(nomStockage: string) {
  return readFile(path.join(DOSSIER, path.basename(nomStockage)));
}
