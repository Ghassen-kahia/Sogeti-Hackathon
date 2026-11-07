"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { voter } from "@/app/actions";

type Etat = { pour: number; contre: number; monVote: number };

function appliquerVote(etat: Etat, valeur: 1 | -1): Etat {
  let { pour, contre } = etat;
  if (etat.monVote === 1) pour--;
  if (etat.monVote === -1) contre--;
  if (etat.monVote === valeur) return { pour, contre, monVote: 0 };
  if (valeur === 1) pour++;
  else contre++;
  return { pour, contre, monVote: valeur };
}

type Props = {
  suggestionId: number;
  pour: number;
  contre: number;
  monVote: number;
  connecte: boolean;
};

export function Vote({ suggestionId, pour, contre, monVote, connecte }: Props) {
  const router = useRouter();
  const [etat, voterOptimiste] = useOptimistic({ pour, contre, monVote }, appliquerVote);
  const [, demarrer] = useTransition();
  const [echec, setEchec] = useState(false);

  function allerConnexion() {
    const retour = window.location.pathname + window.location.search;
    router.push(`/connexion?next=${encodeURIComponent(retour)}`);
  }

  function cliquer(valeur: 1 | -1) {
    if (!connecte) return allerConnexion();
    setEchec(false);
    demarrer(async () => {
      voterOptimiste(valeur);
      const { statut } = await voter(suggestionId, valeur);
      if (statut === "non-connecte") allerConnexion();
      if (statut === "erreur") setEchec(true);
    });
  }

  const total = etat.pour + etat.contre;
  const favorable = total === 0 ? 0 : Math.round((etat.pour / total) * 100);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <BoutonVote actif={etat.monVote === 1} couleur="foret" onClick={() => cliquer(1)}>
          Pour · {etat.pour}
        </BoutonVote>
        <BoutonVote actif={etat.monVote === -1} couleur="tomate" onClick={() => cliquer(-1)}>
          Contre · {etat.contre}
        </BoutonVote>
        <span className="ml-auto text-sm text-gris">
          {total === 0 ? "Pas encore de vote" : `${favorable} % favorables`}
        </span>
      </div>
      {total > 0 && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-tomate/25" aria-hidden>
          <div className="h-full rounded-full bg-foret transition-all" style={{ width: `${favorable}%` }} />
        </div>
      )}
      {echec && <p className="erreur">Votre vote n&apos;a pas été enregistré. Réessayez.</p>}
    </div>
  );
}

type PropsBouton = {
  actif: boolean;
  couleur: "foret" | "tomate";
  onClick: () => void;
  children: React.ReactNode;
};

function BoutonVote({ actif, couleur, onClick, children }: PropsBouton) {
  const styleActif = couleur === "foret" ? "border-foret bg-foret text-white" : "border-tomate bg-tomate text-white";
  const styleRepos =
    couleur === "foret"
      ? "border-trait text-encre hover:border-foret"
      : "border-trait text-encre hover:border-tomate";

  return (
    <button
      type="button"
      aria-pressed={actif}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${actif ? styleActif : styleRepos}`}
    >
      {children}
    </button>
  );
}
