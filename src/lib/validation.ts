import { z } from "zod";

export const MAX_TAGS = 5;
export const MAX_FICHIERS = 3;
export const TAILLE_MAX_FICHIER = 5 * 1024 * 1024;
export const EXTENSIONS_ACCEPTEES = ".pdf,.png,.jpg,.jpeg,.webp,.docx";

export const schemaPseudo = z
  .string({ error: "Choisissez un pseudo." })
  .trim()
  .min(3, "Votre pseudo doit faire au moins 3 caractères.")
  .max(24, "Votre pseudo doit faire au plus 24 caractères.")
  .regex(
    /^[\p{L}\p{N}][\p{L}\p{N} _.-]*$/u,
    "Utilisez des lettres, des chiffres, des espaces, ou les signes _ . -",
  );

const schemaTag = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Un tag doit faire au moins 2 caractères.")
  .max(30, "Un tag doit faire au plus 30 caractères.");

const coordonnee = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(min).max(max).optional(),
  );

export const schemaSuggestion = z
  .object({
    titre: z
      .string({ error: "Donnez un titre à votre idée." })
      .trim()
      .min(5, "Le titre doit faire au moins 5 caractères.")
      .max(120, "Le titre doit faire au plus 120 caractères."),
    description: z
      .string({ error: "Décrivez votre idée." })
      .trim()
      .min(20, "Décrivez votre idée en 20 caractères au moins.")
      .max(3000, "La description doit faire au plus 3000 caractères."),
    categorieId: z.coerce.number().int().positive("Choisissez une catégorie."),
    localisationId: z.coerce.number().int().positive("Choisissez un quartier."),
    tags: z.array(schemaTag).max(MAX_TAGS, `${MAX_TAGS} tags maximum.`),
    latitude: coordonnee(-90, 90),
    longitude: coordonnee(-180, 180),
  })
  .refine((d) => (d.latitude === undefined) === (d.longitude === undefined), {
    path: ["latitude"],
    message: "La position sur la carte est incomplète.",
  });

export type EtatConnexion = { erreur?: string };

type ChampSuggestion = "titre" | "description" | "categorieId" | "localisationId" | "tags" | "fichiers" | "latitude";

export type EtatSuggestion = {
  /** Identifiant de l'idée créée, présent uniquement en cas de succès. */
  id?: number;
  erreurs?: Partial<Record<ChampSuggestion, string>>;
  erreur?: string;
};

/** N'accepte que les chemins internes : évite une redirection vers un site tiers après connexion. */
export function cheminSur(valeur: unknown): string {
  if (typeof valeur !== "string") return "/";
  if (!valeur.startsWith("/") || valeur.startsWith("//") || valeur.includes("\\")) return "/";
  return valeur;
}
