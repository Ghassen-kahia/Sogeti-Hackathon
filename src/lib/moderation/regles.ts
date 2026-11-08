/**
 * Analyse locale d'une idée : aucune dépendance, aucun appel réseau, résultat instantané.
 * Ce fichier ne touche ni à la base ni à Next, pour rester testable seul.
 */

export type Gravite = "ok" | "doute" | "bloque";

export type Motif = { code: string; message: string };

export type Contenu = { titre: string; description: string; tags: string[] };

export type Verdict = { gravite: Gravite; motifs: Motif[] };

type IdeeExistante = { id: number; titre: string; description: string };

export type Doublon = { id: number; titre: string; score: number };

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "@": "a", $: "s" };

const sansAccents = (texte: string) => texte.normalize("NFD").replace(/\p{M}/gu, "");

/** Forme comparable d'un mot : lettres doublées réduites et pluriel retiré ("connards" et "conard" coïncident). */
function formeCanonique(mot: string) {
  return mot.replace(/(.)\1+/gu, "$1").replace(/[sx]$/u, "");
}

function mots(texte: string) {
  // Lettres espacées ("c o n n a r d") : on les recolle avant de découper.
  const recolle = texte.replace(/(?<![\p{L}\p{N}])(?:\p{L}[ .*_-]){2,}\p{L}(?![\p{L}\p{N}])/gu, (m) =>
    m.replace(/[ .*_-]/g, ""),
  );
  return sansAccents(recolle.toLowerCase())
    .replace(/[01345@$]/g, (c) => LEET[c])
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map(formeCanonique);
}

const canoniques = (liste: string[]) => new Set(liste.map((m) => mots(m).join(" ")));

// Comparaison par mot entier : "conseil" ou "ordures ménagères" ne doivent jamais être pris pour des insultes.
const INSULTES = canoniques(["connard", "connasse", "salope", "enculé", "enculer", "pute", "salaud", "fdp", "ntm"]);
const HAINE = canoniques(["bougnoule", "youpin", "négro", "pédé", "pd", "sale arabe", "sale noir", "sale juif", "sale race"]);
const MENACES = canoniques(["je vais te tuer", "il faut les tuer", "je vais le tuer", "va crever", "nique ta mère"]);
const GROSSIERETES = canoniques(["merde", "putain", "bordel", "con", "abruti", "crétin", "débile", "idiot", "bâtard", "nazi"]);
const SPAM = canoniques(["casino", "bitcoin", "crypto", "viagra", "cliquez ici", "code promo", "offre exclusive"]);

function contientUn(tokens: string[], liste: Set<string>) {
  const phrase = ` ${tokens.join(" ")} `;
  for (const entree of liste) {
    if (phrase.includes(` ${entree} `)) return true;
  }
  return false;
}

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+\.[\p{L}]{2,}/u;
const TELEPHONE = /(?:\+33|0033|(?<!\d)0)[\s.-]?[1-9](?:[\s.-]?\d{2}){4}(?!\d)/;
const IBAN = /\bFR\d{2}(?:\s?[A-Z0-9]{4}){5}/i;
const PERSONNE = /\b(?:M\.|Mme|Mlle|Monsieur|Madame)\s+(?!Le\b|La\b|Maire\b)\p{Lu}[\p{L}'-]+/u;
const LIEN = /\b(?:https?:\/\/|www\.)\S+/i;

function majoritairementMajuscules(texte: string) {
  const lettres = texte.replace(/[^\p{L}]/gu, "");
  if (lettres.length < 20) return false;
  return lettres.replace(/[^\p{Lu}]/gu, "").length / lettres.length > 0.7;
}

function tropRepetitif(texte: string) {
  if (/(.)\1{5,}/u.test(texte)) return true;
  const liste = mots(texte);
  return liste.length >= 8 && new Set(liste).size / liste.length < 0.35;
}

export function analyserTexte({ titre, description, tags }: Contenu): Verdict {
  const texte = [titre, description, ...tags].join("\n");
  const tokens = mots(texte);
  const bloquants: Motif[] = [];
  const doutes: Motif[] = [];

  if (contientUn(tokens, HAINE)) {
    bloquants.push({ code: "haine", message: "Votre texte contient des propos discriminatoires." });
  }
  if (contientUn(tokens, MENACES)) {
    bloquants.push({ code: "menace", message: "Votre texte contient des menaces." });
  }
  if (contientUn(tokens, INSULTES)) {
    bloquants.push({ code: "insulte", message: "Votre texte contient des insultes. Reformulez-le." });
  }
  if (EMAIL.test(texte) || TELEPHONE.test(texte) || IBAN.test(texte)) {
    bloquants.push({
      code: "donnees_personnelles",
      message: "Retirez les coordonnées (e-mail, téléphone, IBAN) : elles seraient visibles de tous.",
    });
  }

  if (contientUn(tokens, GROSSIERETES)) {
    doutes.push({ code: "grossierete", message: "Langage grossier ou agressif." });
  }
  if (PERSONNE.test(texte)) {
    doutes.push({ code: "personne_nommee", message: "Une personne semble être nommée." });
  }
  if (LIEN.test(texte)) {
    doutes.push({ code: "lien", message: "Le texte contient un lien externe." });
  }
  if (contientUn(tokens, SPAM)) {
    doutes.push({ code: "spam", message: "Vocabulaire publicitaire." });
  }
  if (majoritairementMajuscules(titre) || majoritairementMajuscules(description)) {
    doutes.push({ code: "majuscules", message: "Texte presque entièrement en majuscules." });
  }
  if (tropRepetitif(description)) {
    doutes.push({ code: "repetition", message: "Texte très répétitif." });
  }

  if (bloquants.length > 0) return { gravite: "bloque", motifs: bloquants };
  return { gravite: doutes.length > 0 ? "doute" : "ok", motifs: doutes };
}

/** Pour les pseudos : ils s'affichent partout, sans passer par la file de modération. */
export function pseudoInacceptable(pseudo: string) {
  const tokens = mots(pseudo);
  return [INSULTES, HAINE, GROSSIERETES].some((liste) => contientUn(tokens, liste));
}

const MOTS_VIDES = new Set(
  mots(
    "les des une pour dans avec sur par que qui aux est sont plus pas nous vous ils elle cette ces ses leur leurs " +
      "mettre installer ajouter creer faire avoir etre tout tous quartier ville idee",
  ),
);

function motsCles(texte: string) {
  // Sans la conversion des chiffres : "30" ne doit pas devenir un mot.
  const liste = sansAccents(texte.toLowerCase())
    .split(/[^\p{L}\p{N}]+/u)
    .map(formeCanonique)
    .filter((m) => m.length > 2 && !MOTS_VIDES.has(m));
  return new Set(liste);
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0;
  let communs = 0;
  for (const mot of a) if (b.has(mot)) communs++;
  return communs / (a.size + b.size - communs);
}

const SEUIL_TITRE = 0.6;
const SEUIL_TEXTE = 0.5;

/** L'idée existante la plus proche, si elle ressemble assez pour être un doublon. */
export function trouverDoublon(contenu: Contenu, existantes: IdeeExistante[]): Doublon | null {
  const titre = motsCles(contenu.titre);
  const complet = motsCles(`${contenu.titre} ${contenu.description}`);
  let meilleur: Doublon | null = null;

  for (const idee of existantes) {
    const scoreTitre = titre.size >= 3 ? jaccard(titre, motsCles(idee.titre)) : 0;
    const scoreTexte = jaccard(complet, motsCles(`${idee.titre} ${idee.description}`));
    if (scoreTitre < SEUIL_TITRE && scoreTexte < SEUIL_TEXTE) continue;

    const score = Math.max(scoreTitre, scoreTexte);
    if (!meilleur || score > meilleur.score) meilleur = { id: idee.id, titre: idee.titre, score };
  }
  return meilleur;
}
