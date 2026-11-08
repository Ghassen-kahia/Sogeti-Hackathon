import { Suspense } from "react";
import { redirect } from "next/navigation";
import { FormulaireConnexion } from "@/components/formulaire-connexion";
import { getUtilisateur } from "@/lib/session";
import { cheminSur } from "@/lib/validation";

export default function PageConnexion({ searchParams }: PageProps<"/connexion">) {
  return (
    <div className="mx-auto max-w-md py-14">
      <div className="rounded-2xl border border-trait bg-carte p-6 sm:p-8">
        <h1 className="font-titre text-3xl font-semibold text-foret">Choisissez un pseudo</h1>
        <p className="mt-2 text-sm leading-relaxed text-gris">
          Ni e-mail, ni mot de passe : votre pseudo suffit pour aimer et proposer des idées. Il n&apos;est pas
          protégé, et reprendre un pseudo existant permet de retrouver ses j&apos;aime.
        </p>
        <Suspense fallback={<div className="mt-6 h-36" />}>
          <Formulaire searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Formulaire({ searchParams }: { searchParams: PageProps<"/connexion">["searchParams"] }) {
  const suivant = cheminSur((await searchParams).next);
  if (await getUtilisateur()) redirect(suivant);
  return <FormulaireConnexion suivant={suivant} />;
}
