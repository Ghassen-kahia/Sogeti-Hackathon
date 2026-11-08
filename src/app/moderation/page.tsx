import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { deconnecterModeration } from "@/app/actions";
import { ActionsModeration } from "@/components/actions-moderation";
import { FormulaireModeration } from "@/components/formulaire-moderation";
import { BadgeCategorie, dateFr } from "@/components/idee-card";
import { getTableauModeration, type IdeeModeration } from "@/lib/queries";
import { estModerateur } from "@/lib/session";
import { MOTIFS_SIGNALEMENT, type MotifSignalement } from "@/lib/validation";

export const metadata: Metadata = { title: "Modération | Quartia" };

const SOURCES: Record<string, string> = {
  regles: "Règles automatiques",
  ia: "Analyse IA",
  signalements: "Signalements d'habitants",
};

export default function PageModeration() {
  return (
    <Suspense fallback={<div className="mt-10 h-96 animate-pulse rounded-2xl bg-trait/50" />}>
      <Contenu />
    </Suspense>
  );
}

async function Contenu() {
  if (!(await estModerateur())) {
    return (
      <div className="mx-auto max-w-md py-14">
        <div className="rounded-2xl border border-trait bg-carte p-6 sm:p-8">
          <h1 className="font-titre text-3xl font-semibold text-foret">Espace modération</h1>
          <p className="mt-2 text-sm leading-relaxed text-gris">Réservé aux agents de la collectivité.</p>
          <FormulaireModeration />
        </div>
      </div>
    );
  }
  return <Tableau />;
}

async function Tableau() {
  const { file, rejetees, compteurs } = await getTableauModeration();
  const chiffres = [
    { valeur: compteurs.enAttente, libelle: "à relire" },
    { valeur: compteurs.publiees, libelle: "publiées" },
    { valeur: compteurs.rejetees, libelle: "rejetées" },
    { valeur: compteurs.signalements, libelle: "signalements" },
  ];

  return (
    <div className="py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-titre text-3xl font-semibold text-foret sm:text-4xl">Modération</h1>
        <form action={deconnecterModeration}>
          <button type="submit" className="text-sm text-gris hover:text-encre hover:underline">
            Quitter l&apos;espace modération
          </button>
        </form>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {chiffres.map((c) => (
          <div key={c.libelle} className="rounded-2xl border border-trait bg-carte p-4">
            <dd className="font-titre text-3xl font-semibold">{c.valeur}</dd>
            <dt className="text-sm text-gris">{c.libelle}</dt>
          </div>
        ))}
      </dl>

      <h2 className="mt-10 mb-3 font-titre text-2xl font-semibold">À relire</h2>
      {file.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-trait p-10 text-center text-gris">
          Aucune idée en attente. Tout est à jour.
        </p>
      ) : (
        <div className="space-y-4">
          {file.map((idee) => (
            <CarteModeration key={idee.id} idee={idee} />
          ))}
        </div>
      )}

      {rejetees.length > 0 && (
        <>
          <h2 className="mt-10 mb-3 font-titre text-2xl font-semibold">Dernières idées rejetées</h2>
          <div className="space-y-4">
            {rejetees.map((idee) => (
              <CarteModeration key={idee.id} idee={idee} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function compterMotifs(signalements: IdeeModeration["signalements"]) {
  const comptes = new Map<string, number>();
  for (const { motif } of signalements) comptes.set(motif, (comptes.get(motif) ?? 0) + 1);
  return [...comptes];
}

function CarteModeration({ idee }: { idee: IdeeModeration }) {
  return (
    <article className="rounded-2xl border border-trait bg-carte p-5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gris">
        <BadgeCategorie {...idee.categorie} />
        <span>{idee.localisation.nom}</span>
        <span>
          · Par {idee.auteur.nickname}, le {dateFr(idee.createdAt)}
        </span>
      </div>

      <h3 className="mt-2.5 font-titre text-xl leading-snug font-semibold">
        <Link href={`/idees/${idee.id}`} className="hover:text-foret hover:underline">
          {idee.titre}
        </Link>
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed break-words whitespace-pre-line text-gris">{idee.description}</p>

      <div className="mt-3 rounded-xl bg-soleil/15 p-3 text-sm">
        <p className="font-semibold">{SOURCES[idee.analyseePar ?? ""] ?? "Décision"}</p>
        <ul className="mt-1 list-inside list-disc">
          {idee.motifsModeration.map((motif) => (
            <li key={motif}>{motif}</li>
          ))}
          {compterMotifs(idee.signalements).map(([motif, nombre]) => (
            <li key={motif}>
              {MOTIFS_SIGNALEMENT[motif as MotifSignalement] ?? motif} ({nombre})
            </li>
          ))}
        </ul>
      </div>

      {idee.piecesJointes.length > 0 && (
        <ul className="mt-3 text-sm">
          {idee.piecesJointes.map((piece) => (
            <li key={piece.id}>
              <a href={`/api/pieces-jointes/${piece.id}`} className="text-foret underline">
                {piece.nomOriginal}
              </a>
            </li>
          ))}
        </ul>
      )}

      {idee.noteModeration && <p className="mt-3 text-sm text-gris">Message à l&apos;auteur : {idee.noteModeration}</p>}

      <div className="mt-4">
        <ActionsModeration id={idee.id} statut={idee.statut} />
      </div>
    </article>
  );
}
