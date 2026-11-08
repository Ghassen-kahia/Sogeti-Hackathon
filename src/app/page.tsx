import { Suspense } from "react";
import Link from "next/link";
import { CarteIdees } from "@/components/carte-lazy";
import { Filtres } from "@/components/filtres";
import { IdeeCard } from "@/components/idee-card";
import { grouperLieux, lieuParDefaut } from "@/lib/lieux";
import {
  getMesLikes,
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
            Proposez une amélioration, découvrez celles de vos voisins et soutenez celles qui vous plaisent. Un simple
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
    { valeur: votes, libelle: "j'aime" },
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

/** Les filtres survivent au changement de vue et de page : ils vivent tous dans l'URL. */
function urlFil(filtres: FiltresActifs, vue: FiltresActifs["vue"], page = 1) {
  const params = new URLSearchParams();
  for (const cle of ["q", "quartier", "categorie", "tag"] as const) {
    if (filtres[cle]) params.set(cle, filtres[cle]);
  }
  if (filtres.tri !== "recentes") params.set("tri", filtres.tri);
  if (vue === "carte") params.set("vue", vue);
  if (page > 1) params.set("page", String(page));
  const requete = params.toString();
  return requete ? `/?${requete}` : "/";
}

function ChoixVue({ filtres }: { filtres: FiltresActifs }) {
  const vues = [
    { vue: "fiches", libelle: "Fiches" },
    { vue: "carte", libelle: "Carte" },
  ] as const;

  return (
    <nav aria-label="Affichage des idées" className="choix-segmente carte-facultative">
      {vues.map(({ vue, libelle }) => (
        <Link key={vue} href={urlFil(filtres, vue)} scroll={false} aria-current={filtres.vue === vue ? "page" : undefined}>
          {libelle}
        </Link>
      ))}
    </nav>
  );
}

async function Fil({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const filtres = lireFiltres(await searchParams);
  const enCarte = filtres.vue === "carte";
  const [liste, epingles, referentiels, utilisateur] = await Promise.all([
    enCarte ? null : listerSuggestions(filtres),
    enCarte ? listerEpingles(filtres) : [],
    getReferentiels(),
    getUtilisateur(),
  ]);

  const { localisations, categories, tags } = referentiels;
  const quartier = localisations.find((l) => l.slug === filtres.quartier) ?? lieuParDefaut(localisations);
  const centre = quartier ?? { latitude: 46.6, longitude: 2.4 };
  const nombre = liste?.total ?? epingles.length;

  return (
    <div className="space-y-4">
      <Filtres
        actifs={filtres}
        quartiers={grouperLieux(localisations).map((groupe) => ({
          libelle: groupe.libelle,
          options: groupe.lieux.map((l) => ({ valeur: l.slug, libelle: l.nom })),
        }))}
        categories={categories.map((c) => ({ valeur: c.slug, libelle: c.nom }))}
        tags={tags.map((t) => ({ valeur: t.nom, libelle: `#${t.nom}` }))}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gris">
          {nombre} idée{nombre > 1 ? "s" : ""}
          {enCarte && " sur la carte"}
        </p>
        <ChoixVue filtres={filtres} />
      </div>

      {liste ? (
        <Fiches liste={liste} filtres={filtres} userId={utilisateur?.id} />
      ) : (
        <>
          <section aria-label="Carte des idées" className="carte-facultative">
            <div className="isolate h-[calc(100vh-7rem)] min-h-[28rem] overflow-hidden rounded-2xl border border-trait">
              <CarteIdees epingles={epingles} centre={centre} zoom={quartier ? 13 : 5} legende />
            </div>
          </section>
          <p className="message-sans-carte rounded-2xl border border-trait bg-carte p-5">
            Vos réglages d&apos;accessibilité masquent les cartes.{" "}
            <Link href={urlFil(filtres, "fiches")} className="font-semibold text-foret underline">
              Voir les idées en fiches
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

type PropsFiches = {
  liste: Awaited<ReturnType<typeof listerSuggestions>>;
  filtres: FiltresActifs;
  userId: number | undefined;
};

async function Fiches({ liste, filtres, userId }: PropsFiches) {
  const { suggestions, pages } = liste;
  const mesLikes = await getMesLikes(
    userId,
    suggestions.map((s) => s.id),
  );

  return (
    <section aria-label="Idées">
      {suggestions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-trait p-10 text-center">
          <p className="font-titre text-xl font-semibold">Aucune idée ici pour l&apos;instant.</p>
          <p className="mt-2 text-sm text-gris">Élargissez votre recherche, ou lancez la première.</p>
          <Link href="/idees/nouvelle" className="bouton-plein mt-4">
            Proposer une idée
          </Link>
        </div>
      ) : (
        <div className="grille-fiches">
          {suggestions.map((idee) => (
            <IdeeCard key={idee.id} idee={idee} aime={mesLikes.has(idee.id)} connecte={Boolean(userId)} />
          ))}
        </div>
      )}

      {pages > 1 && <Pagination filtres={filtres} pages={pages} />}
    </section>
  );
}

function Pagination({ filtres, pages }: { filtres: FiltresActifs; pages: number }) {
  const lien = (page: number) => urlFil(filtres, filtres.vue, page);

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
    <div className="grille-fiches animate-pulse">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-52 rounded-2xl bg-trait/50" />
      ))}
    </div>
  );
}
