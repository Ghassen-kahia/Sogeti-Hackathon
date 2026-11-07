import { Suspense } from "react";
import Link from "next/link";
import { CarteIdees } from "@/components/carte-lazy";
import { Filtres } from "@/components/filtres";
import { IdeeCard } from "@/components/idee-card";
import {
  getMesVotes,
  getReferentiels,
  getStatistiques,
  lireFiltres,
  listerEpingles,
  listerSuggestions,
  type Filtres as FiltresActifs,
} from "@/lib/queries";
import { getUtilisateur } from "@/lib/session";

export default function Accueil({ searchParams }: PageProps<"/">) {
  return (
    <>
      <section className="grid gap-8 py-10 sm:py-14 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-2xl">
          <h1 className="font-titre text-4xl leading-tight font-semibold text-foret sm:text-6xl">
            Votre quartier s&apos;invente ici.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-gris">
            Proposez une amélioration, découvrez celles de vos voisins et dites ce que vous en pensez. Un simple
            pseudo suffit pour participer.
          </p>
        </div>
        <Suspense fallback={<div className="h-16 w-72" />}>
          <Chiffres />
        </Suspense>
      </section>

      <Suspense fallback={<SqueletteFil />}>
        <Fil searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Chiffres() {
  const { idees, votes, voisins } = await getStatistiques();
  const chiffres = [
    { valeur: idees, libelle: "idées" },
    { valeur: votes, libelle: "votes" },
    { valeur: voisins, libelle: "voisins" },
  ];

  return (
    <dl className="flex gap-8">
      {chiffres.map((c) => (
        <div key={c.libelle}>
          <dd className="font-titre text-4xl font-semibold">{c.valeur}</dd>
          <dt className="text-sm text-gris">{c.libelle}</dt>
        </div>
      ))}
    </dl>
  );
}

async function Fil({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const filtres = lireFiltres(await searchParams);
  const [{ suggestions, total, pages }, epingles, referentiels, utilisateur] = await Promise.all([
    listerSuggestions(filtres),
    listerEpingles(filtres),
    getReferentiels(),
    getUtilisateur(),
  ]);
  const mesVotes = await getMesVotes(
    utilisateur?.id,
    suggestions.map((s) => s.id),
  );

  const { localisations, categories, tags } = referentiels;
  const quartier = localisations.find((l) => l.slug === filtres.quartier) ?? localisations[0];
  const centre = quartier ?? { latitude: 46.6, longitude: 2.4 };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0 lg:col-span-2">
        <Filtres
          actifs={filtres}
          quartiers={localisations.map((l) => ({ valeur: l.slug, libelle: l.nom }))}
          categories={categories.map((c) => ({ valeur: c.slug, libelle: c.nom }))}
          tags={tags.map((t) => ({ valeur: t.nom, libelle: `#${t.nom}` }))}
        />
      </div>

      <aside className="lg:sticky lg:top-20 lg:order-2 lg:self-start" aria-label="Carte des idées">
        <div className="isolate h-72 overflow-hidden rounded-2xl border border-trait lg:h-[calc(100vh-7rem)]">
          <CarteIdees epingles={epingles} centre={centre} zoom={quartier ? 13 : 5} />
        </div>
      </aside>

      <section className="min-w-0 lg:order-1" aria-label="Idées">
        <p className="mb-3 text-sm text-gris">
          {total} idée{total > 1 ? "s" : ""}
        </p>

        {suggestions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-trait p-10 text-center">
            <p className="font-titre text-xl font-semibold">Aucune idée ici pour l&apos;instant.</p>
            <p className="mt-2 text-sm text-gris">Élargissez votre recherche, ou lancez la première.</p>
            <Link href="/idees/nouvelle" className="bouton-plein mt-4">
              Proposer une idée
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((idee) => (
              <IdeeCard key={idee.id} idee={idee} monVote={mesVotes[idee.id] ?? 0} connecte={Boolean(utilisateur)} />
            ))}
          </div>
        )}

        {pages > 1 && <Pagination filtres={filtres} pages={pages} />}
      </section>
    </div>
  );
}

function Pagination({ filtres, pages }: { filtres: FiltresActifs; pages: number }) {
  function lien(page: number) {
    const params = new URLSearchParams();
    for (const cle of ["q", "quartier", "categorie", "tag"] as const) {
      if (filtres[cle]) params.set(cle, filtres[cle]);
    }
    if (filtres.tri !== "recentes") params.set("tri", filtres.tri);
    if (page > 1) params.set("page", String(page));
    const requete = params.toString();
    return requete ? `/?${requete}` : "/";
  }

  return (
    <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
      {filtres.page > 1 ? (
        <Link href={lien(filtres.page - 1)} className="bouton-contour">
          Précédent
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-gris">
        Page {filtres.page} sur {pages}
      </span>
      {filtres.page < pages ? (
        <Link href={lien(filtres.page + 1)} className="bouton-contour">
          Suivant
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

function SqueletteFil() {
  return (
    <div className="grid animate-pulse gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-52 rounded-2xl bg-trait/50" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-trait/50 lg:h-[calc(100vh-7rem)]" />
    </div>
  );
}
