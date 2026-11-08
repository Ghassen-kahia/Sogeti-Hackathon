"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { basculerJaime } from "@/app/actions";

type Etat = { likes: number; aime: boolean };

function basculer(etat: Etat): Etat {
  return { likes: etat.likes + (etat.aime ? -1 : 1), aime: !etat.aime };
}

type Props = { suggestionId: number; likes: number; aime: boolean; connecte: boolean };

export function BoutonJaime({ suggestionId, likes, aime, connecte }: Props) {
  const router = useRouter();
  const [etat, basculerOptimiste] = useOptimistic({ likes, aime }, basculer);
  const [, demarrer] = useTransition();
  const [echec, setEchec] = useState(false);

  function allerConnexion() {
    const retour = window.location.pathname + window.location.search;
    router.push(`/connexion?next=${encodeURIComponent(retour)}`);
  }

  function cliquer() {
    if (!connecte) return allerConnexion();
    setEchec(false);
    demarrer(async () => {
      basculerOptimiste(null);
      const { statut } = await basculerJaime(suggestionId);
      if (statut === "non-connecte") allerConnexion();
      if (statut === "erreur") setEchec(true);
    });
  }

  return (
    <div>
      <button
        type="button"
        aria-pressed={etat.aime}
        onClick={cliquer}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
          etat.aime ? "border-tomate bg-tomate text-white" : "border-trait text-encre hover:border-tomate"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="size-4"
          fill={etat.aime ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        >
          <path d="M12 20.5s-8.5-5-8.5-11A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 2.9c0 6-8.5 11-8.5 11z" />
        </svg>
        J&apos;aime · {etat.likes}
      </button>
      {echec && <p className="erreur">Votre j&apos;aime n&apos;a pas été enregistré. Réessayez.</p>}
    </div>
  );
}
