"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signaler } from "@/app/actions";
import { MOTIFS_SIGNALEMENT, type MotifSignalement } from "@/lib/validation";

const MESSAGES = {
  ok: "Merci, votre signalement a été transmis.",
  deja: "Vous avez déjà signalé cette idée.",
  erreur: "Votre signalement n'a pas été enregistré. Réessayez.",
};

const motifs = Object.entries(MOTIFS_SIGNALEMENT) as [MotifSignalement, string][];

type Props = { suggestionId: number; connecte: boolean };

export function Signaler({ suggestionId, connecte }: Props) {
  const router = useRouter();
  const [motif, setMotif] = useState<MotifSignalement>(motifs[0][0]);
  const [message, setMessage] = useState("");
  const [enCours, demarrer] = useTransition();

  function allerConnexion() {
    router.push(`/connexion?next=${encodeURIComponent(window.location.pathname)}`);
  }

  function envoyer() {
    if (!connecte) return allerConnexion();
    demarrer(async () => {
      const { statut } = await signaler(suggestionId, motif);
      if (statut === "non-connecte") return allerConnexion();
      setMessage(MESSAGES[statut]);
    });
  }

  return (
    <details className="mt-8 text-sm text-gris">
      <summary className="cursor-pointer hover:text-encre">Signaler cette idée</summary>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor="motif-signalement" className="sr-only">
          Motif du signalement
        </label>
        <select
          id="motif-signalement"
          value={motif}
          onChange={(e) => setMotif(e.target.value as MotifSignalement)}
          className="champ max-w-xs"
        >
          {motifs.map(([valeur, libelle]) => (
            <option key={valeur} value={valeur}>
              {libelle}
            </option>
          ))}
        </select>
        <button type="button" onClick={envoyer} disabled={enCours} className="bouton-contour">
          Envoyer
        </button>
      </div>
      {message && (
        <p role="status" className="mt-2">
          {message}
        </p>
      )}
    </details>
  );
}
