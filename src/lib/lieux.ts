const VILLE_CENTRE = "Dijon";
const LIEU_PAR_DEFAUT = "centre-ville";

type Lieu = { nom: string; ville: string };

/** Les 42 lieux, rangés en deux groupes pour rester lisibles dans une liste déroulante. */
export function grouperLieux<T extends Lieu>(lieux: T[]) {
  const tries = [...lieux].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  return [
    { libelle: `Quartiers de ${VILLE_CENTRE}`, lieux: tries.filter((l) => l.ville === VILLE_CENTRE) },
    { libelle: "Communes de la métropole", lieux: tries.filter((l) => l.ville !== VILLE_CENTRE) },
  ].filter((groupe) => groupe.lieux.length > 0);
}

export function lieuParDefaut<T extends { slug: string }>(lieux: T[]) {
  return lieux.find((l) => l.slug === LIEU_PAR_DEFAUT) ?? lieux[0];
}
