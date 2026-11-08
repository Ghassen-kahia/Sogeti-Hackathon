/**
 * Préférences d'accessibilité. Elles restent dans le navigateur : un handicap est une donnée de santé,
 * et le serveur n'a pas besoin de la connaître pour adapter l'affichage.
 */

export const CLE_STOCKAGE = "pc_accessibilite";

export type Reglages = {
  taille: "normal" | "grand" | "tres-grand";
  police: "standard" | "dyslexie" | "lisible";
  contraste: boolean;
  liens: boolean;
  cibles: boolean;
  focus: boolean;
  animations: boolean;
  carte: boolean;
  lecture: boolean;
};

export const REGLAGES_STANDARD: Reglages = {
  taille: "normal",
  police: "standard",
  contraste: false,
  liens: false,
  cibles: false,
  focus: false,
  animations: false,
  carte: false,
  lecture: false,
};

export type IdProfil = "dyslexie" | "malvoyance" | "daltonisme" | "moteur" | "concentration";

type Profil = { id: IdProfil; titre: string; description: string; reglages: Partial<Reglages> };

export const PROFILS: Profil[] = [
  {
    id: "dyslexie",
    titre: "Dyslexie ou difficultés de lecture",
    description: "Police adaptée, lettres et lignes plus espacées, lecture à voix haute.",
    reglages: { police: "dyslexie", taille: "grand", lecture: true },
  },
  {
    id: "malvoyance",
    titre: "Mauvaise vue",
    description: "Très grand texte, contraste renforcé, liens soulignés, lecture à voix haute.",
    reglages: { police: "lisible", taille: "tres-grand", contraste: true, liens: true, focus: true, lecture: true },
  },
  {
    id: "daltonisme",
    titre: "Daltonisme",
    description: "Contraste renforcé et liens soulignés : rien ne repose sur la seule couleur.",
    reglages: { contraste: true, liens: true },
  },
  {
    id: "moteur",
    titre: "Handicap moteur",
    description: "Boutons plus grands, repère clavier très visible, aucune animation.",
    reglages: { cibles: true, focus: true, animations: true },
  },
  {
    id: "concentration",
    titre: "Difficultés de concentration",
    description: "Page épurée sans carte, aucune animation, lecture à voix haute.",
    reglages: { carte: true, animations: true, lecture: true },
  },
];

const ORDRE_TAILLES: Reglages["taille"][] = ["normal", "grand", "tres-grand"];

/** Combine plusieurs profils : chaque aide activée le reste, et la plus grande taille de texte l'emporte. */
export function reglagesDesProfils(ids: IdProfil[]): Reglages {
  const reglages = { ...REGLAGES_STANDARD };
  for (const profil of PROFILS.filter((p) => ids.includes(p.id))) {
    const { taille, police, ...aides } = profil.reglages;
    Object.assign(reglages, aides);
    if (taille && ORDRE_TAILLES.indexOf(taille) > ORDRE_TAILLES.indexOf(reglages.taille)) reglages.taille = taille;
    // La police pensée pour la dyslexie reste aussi très lisible : elle passe en priorité.
    if (police && reglages.police !== "dyslexie") reglages.police = police;
  }
  return reglages;
}

export type Preferences = { profils: IdProfil[]; reglages: Reglages };

/** Une valeur illisible vaut « pas encore de choix » : le visiteur se verra reposer la question. */
export function lirePreferences(brut: string | null | undefined): Preferences | null {
  if (!brut) return null;
  try {
    const { profils, reglages } = JSON.parse(brut);
    if (!Array.isArray(profils) || typeof reglages !== "object" || reglages === null) return null;
    return { profils, reglages: { ...REGLAGES_STANDARD, ...reglages } };
  } catch {
    return null;
  }
}

export function appliquerReglages(reglages: Reglages) {
  for (const [nom, valeur] of Object.entries(reglages)) {
    document.documentElement.setAttribute(`data-a11y-${nom}`, String(valeur));
  }
}

/** Exécuté avant le premier affichage : la page ne clignote pas dans son apparence par défaut. */
export const SCRIPT_INITIAL = `try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(CLE_STOCKAGE)}));if(p&&p.reglages)for(var k in p.reglages)document.documentElement.setAttribute("data-a11y-"+k,String(p.reglages[k]))}catch(e){}`;
