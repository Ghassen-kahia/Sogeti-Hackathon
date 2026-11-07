"use client";

import type { ChangeEvent } from "react";
import Form from "next/form";

type Option = { valeur: string; libelle: string };

type Props = {
  actifs: { q: string; quartier: string; categorie: string; tag: string; tri: string };
  quartiers: Option[];
  categories: Option[];
  tags: Option[];
};

// Chaque changement relance le formulaire GET : les filtres vivent dans l'URL et restent partageables.
function soumettre(e: ChangeEvent<HTMLSelectElement>) {
  e.currentTarget.form?.requestSubmit();
}

export function Filtres({ actifs, quartiers, categories, tags }: Props) {
  return (
    <Form action="/" key={JSON.stringify(actifs)} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
        <label htmlFor="recherche" className="sr-only">
          Rechercher une idée
        </label>
        <input
          id="recherche"
          name="q"
          type="search"
          defaultValue={actifs.q}
          placeholder="Rechercher une idée"
          className="champ"
        />
        <button type="submit" className="bouton-contour">
          Rechercher
        </button>
      </div>

      <Liste nom="quartier" libelle="Quartier" tous="Tous les quartiers" valeur={actifs.quartier} options={quartiers} />
      <Liste nom="categorie" libelle="Catégorie" tous="Toutes les catégories" valeur={actifs.categorie} options={categories} />
      <Liste nom="tag" libelle="Tag" tous="Tous les tags" valeur={actifs.tag} options={tags} />

      <div>
        <label htmlFor="tri" className="sr-only">
          Trier par
        </label>
        <select id="tri" name="tri" defaultValue={actifs.tri} onChange={soumettre} className="champ">
          <option value="recentes">Les plus récentes</option>
          <option value="mieux-notees">Les mieux notées</option>
        </select>
      </div>
    </Form>
  );
}

type PropsListe = { nom: string; libelle: string; tous: string; valeur: string; options: Option[] };

function Liste({ nom, libelle, tous, valeur, options }: PropsListe) {
  return (
    <div>
      <label htmlFor={nom} className="sr-only">
        {libelle}
      </label>
      <select id={nom} name={nom} defaultValue={valeur} onChange={soumettre} className="champ">
        <option value="">{tous}</option>
        {options.map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.libelle}
          </option>
        ))}
      </select>
    </div>
  );
}
