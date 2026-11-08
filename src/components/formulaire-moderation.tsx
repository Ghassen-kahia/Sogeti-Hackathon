"use client";

import { useActionState } from "react";
import { connecterModeration } from "@/app/actions";

export function FormulaireModeration() {
  const [etat, action, enCours] = useActionState(connecterModeration, {});

  return (
    <form action={action} className="mt-6">
      <label htmlFor="code" className="libelle">
        Code d&apos;accès
      </label>
      <input
        id="code"
        name="code"
        type="password"
        required
        autoComplete="off"
        aria-invalid={Boolean(etat.erreur)}
        aria-describedby={etat.erreur ? "erreur-code" : undefined}
        className="champ"
      />
      {etat.erreur && (
        <p id="erreur-code" className="erreur">
          {etat.erreur}
        </p>
      )}
      <button type="submit" disabled={enCours} className="bouton-plein mt-4 w-full">
        {enCours ? "Vérification…" : "Entrer"}
      </button>
    </form>
  );
}
