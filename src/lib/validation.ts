import { z } from "zod";

export const MAX_TAGS = 5;
export const MAX_FICHIERS = 3;
export const TAILLE_MAX_FICHIER = 5 * 1024 * 1024;
export const EXTENSIONS_ACCEPTEES = ".pdf,.png,.jpg,.jpeg,.webp,.docx";
const LONGUEUR_MAX_PSEUDO = 24;
const ID_MAX = 2147483647;

/** Identifiant utilisable en base : hors de l'intervalle d'un INTEGER, PostgreSQL rejette la requête. */
export function estIdValide(id: number) {
  return Number.isInteger(id) && id >= 1 && id <= ID_MAX;
}

export const schemaPseudo = z
  .string({ error: "Choisissez un pseudo." })
  .trim()
  .min(3, "Votre pseudo doit faire au moins 3 caractères.")
  .max(LONGUEUR_MAX_PSEUDO, `Votre pseudo doit faire au plus ${LONGUEUR_MAX_PSEUDO} caractères.`)
  .regex(
    /^[\p{L}\p{N}][\p{L}\p{N} _.-]*$/u,
    "Utilisez des lettres, des chiffres, des espaces, ou les signes _ . -",
  )
  // Certaines lettres s'allongent en minuscules (İ) : la clé d'unicité doit tenir dans sa colonne.
  .refine((p) => p.toLowerCase().length <= LONGUEUR_MAX_PSEUDO, "Votre pseudo est trop long.");

const schemaTag = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Un tag doit faire au moins 2 caractères.")
  .max(30, "Un tag doit faire au plus 30 caractères.");

const POSITION_INVALIDE = "La position choisie sur la carte n'est pas valide.";

const coordonnee = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(min, POSITION_INVALIDE).max(max, POSITION_INVALIDE).optional(),
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
    localisationId: z.coerce.number().int().positive("Choisissez un lieu."),
    tags: z.array(schemaTag).max(MAX_TAGS, `${MAX_TAGS} tags maximum.`),
    latitude: coordonnee(-90, 90),
    longitude: coordonnee(-180, 180),
  })
  .refine((d) => (d.latitude === undefined) === (d.longitude === undefined), {
    path: ["latitude"],
    message: "La position sur la carte est incomplète.",
  });

export const SEUIL_SIGNALEMENTS = 3;

export const MOTIFS_SIGNALEMENT = {
  agressif: "Propos agressifs ou insultants",
  personne: "Met en cause une personne",
  hors_sujet: "Sans rapport avec le quartier",
  publicite: "Publicité ou arnaque",
} as const;

export type MotifSignalement = keyof typeof MOTIFS_SIGNALEMENT;

export const schemaDecision = z.object({
  id: z.coerce.number().refine(estIdValide),
  decision: z.enum(["PUBLIEE", "REJETEE"]),
  note: z.string().trim().max(500).optional(),
});

export type EtatConnexion = { erreur?: string };

type ChampSuggestion = "titre" | "description" | "categorieId" | "localisationId" | "tags" | "fichiers" | "latitude";

export type EtatSuggestion = {
  /** Identifiant de l'idée créée, présent uniquement en cas de succès. */
  id?: number;
  /** Raisons pour lesquelles le texte est refusé : l'auteur peut le corriger et réessayer. */
  refus?: string[];
  erreurs?: Partial<Record<ChampSuggestion, string>>;
  erreur?: string;
};

/** N'accepte que les chemins internes : évite une redirection vers un site tiers après connexion. */
export function cheminSur(valeur: unknown): string {
  if (typeof valeur !== "string") return "/";
  if (!valeur.startsWith("/") || valeur.startsWith("//")) return "/";
  // Les navigateurs ignorent tabulations et retours à la ligne dans une URL : "/\t/site.fr" deviendrait "//site.fr".
  if (/[\\\x00-\x1f\x7f]/.test(valeur)) return "/";
  return valeur;
}
