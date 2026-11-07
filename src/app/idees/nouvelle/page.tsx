import { Suspense } from "react";
import { redirect } from "next/navigation";
import { FormulaireSuggestion } from "@/components/formulaire-suggestion";
import { getReferentiels } from "@/lib/queries";
import { getUtilisateur } from "@/lib/session";

export default function PageNouvelleIdee() {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <h1 className="font-titre text-3xl font-semibold text-foret sm:text-4xl">Proposer une idée</h1>
      <p className="mt-2 text-gris">Vos voisins pourront la découvrir et voter dès sa publication.</p>
      <Suspense fallback={<div className="mt-8 h-96 animate-pulse rounded-2xl bg-trait/50" />}>
        <Formulaire />
      </Suspense>
    </div>
  );
}

async function Formulaire() {
  const utilisateur = await getUtilisateur();
  if (!utilisateur) redirect("/connexion?next=/idees/nouvelle");

  const { categories, localisations, tags } = await getReferentiels();
  return (
    <FormulaireSuggestion
      // Le brouillon d'un habitant ne doit pas réapparaître pour le pseudo suivant sur le même navigateur.
      key={utilisateur.id}
      categories={categories}
      quartiers={localisations}
      tagsExistants={tags.map((t) => t.nom)}
    />
  );
}
