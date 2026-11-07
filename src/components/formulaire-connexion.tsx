"use client";

import { useActionState } from "react";
import { seConnecter } from "@/app/actions";

export function FormulaireConnexion({ suivant }: { suivant: string }) {
  const [etat, action, enCours] = useActionState(seConnecter, {});

  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="next" value={suivant} />
      <label htmlFor="nickname" className="libelle">
        Votre pseudo
      </label>
      <input
        id="nickname"
        name="nickname"
        required
        minLength={3}
        maxLength={24}
        autoComplete="nickname"
        autoFocus
        aria-invalid={Boolean(etat.erreur)}
        aria-describedby={etat.erreur ? "erreur-pseudo" : undefined}
        className="champ"
      />
      {etat.erreur && (
        <p id="erreur-pseudo" className="erreur">
          {etat.erreur}
        </p>
      )}
      <button type="submit" disabled={enCours} className="bouton-plein mt-4 w-full">
        {enCours ? "Connexion…" : "Continuer"}
      </button>
    </form>
  );
}
