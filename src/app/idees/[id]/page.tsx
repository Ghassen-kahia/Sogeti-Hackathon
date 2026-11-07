import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CarteIdees } from "@/components/carte-lazy";
import { BadgeCategorie, dateFr } from "@/components/idee-card";
import { Vote } from "@/components/vote";
import { getMesVotes, getSuggestion } from "@/lib/queries";
import { getUtilisateur } from "@/lib/session";

export default function PageIdee({ params }: PageProps<"/idees/[id]">) {
  return (
    <div className="mx-auto max-w-3xl py-8">
      <Link href="/" className="text-sm text-gris hover:text-encre hover:underline">
        ← Toutes les idées
      </Link>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-2xl bg-trait/50" />}>
        <Idee params={params} />
      </Suspense>
    </div>
  );
}

function tailleLisible(octets: number) {
  if (octets < 1024 * 1024) return `${Math.max(1, Math.round(octets / 1024))} Ko`;
  return `${(octets / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}

async function Idee({ params }: { params: PageProps<"/idees/[id]">["params"] }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) notFound();

  const [idee, utilisateur] = await Promise.all([getSuggestion(id), getUtilisateur()]);
  if (!idee) notFound();

  const mesVotes = await getMesVotes(utilisateur?.id, [id]);
  const images = idee.piecesJointes.filter((p) => p.typeMime.startsWith("image/"));
  const documents = idee.piecesJointes.filter((p) => !p.typeMime.startsWith("image/"));

  return (
    <article className="mt-6">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gris">
        <BadgeCategorie nom={idee.categorie.nom} couleur={idee.categorie.couleur} />
        <span>{idee.localisation.nom}</span>
      </div>
      <h1 className="mt-3 font-titre text-3xl leading-tight font-semibold text-foret sm:text-4xl">{idee.titre}</h1>
      <p className="mt-2 text-sm text-gris">
        Par {idee.auteur.nickname}, le {dateFr(idee.createdAt)}
      </p>

      <p className="mt-6 leading-relaxed break-words whitespace-pre-line">{idee.description}</p>

      {idee.tags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {idee.tags.map((tag) => (
            <li key={tag.nom}>
              <Link href={`/?tag=${encodeURIComponent(tag.nom)}`} className="text-foret hover:underline">
                #{tag.nom}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-8 rounded-2xl border border-trait bg-carte p-5">
        <h2 className="mb-3 font-titre text-lg font-semibold">Qu&apos;en pensez-vous ?</h2>
        <Vote
          suggestionId={idee.id}
          pour={idee.votesPour}
          contre={idee.votesContre}
          monVote={mesVotes[idee.id] ?? 0}
          connecte={Boolean(utilisateur)}
        />
      </section>

      {idee.piecesJointes.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-titre text-lg font-semibold">Documents</h2>
          {images.length > 0 && (
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              {images.map((image) => (
                <a key={image.id} href={`/api/pieces-jointes/${image.id}`} target="_blank" rel="noreferrer">
                  {/* Fichier envoyé par un habitant, servi par notre route : next/image n'apporte rien ici. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/pieces-jointes/${image.id}`}
                    alt={image.nomOriginal}
                    className="h-48 w-full rounded-xl border border-trait object-cover"
                  />
                </a>
              ))}
            </div>
          )}
          {documents.length > 0 && (
            <ul className="divide-y divide-trait rounded-2xl border border-trait bg-carte">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <a
                    href={`/api/pieces-jointes/${doc.id}`}
                    className="flex items-center justify-between gap-4 p-4 text-sm hover:text-foret"
                  >
                    <span className="min-w-0 truncate font-semibold">{doc.nomOriginal}</span>
                    <span className="shrink-0 text-gris">{tailleLisible(doc.taille)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {idee.latitude !== null && idee.longitude !== null && (
        <section className="mt-8">
          <h2 className="mb-3 font-titre text-lg font-semibold">Emplacement</h2>
          <div className="isolate h-72 overflow-hidden rounded-2xl border border-trait">
            <CarteIdees
              centre={{ latitude: idee.latitude, longitude: idee.longitude }}
              zoom={15}
              epingles={[
                {
                  id: idee.id,
                  titre: idee.titre,
                  latitude: idee.latitude,
                  longitude: idee.longitude,
                  votesPour: idee.votesPour,
                  votesContre: idee.votesContre,
                  categorie: idee.categorie.nom,
                  couleur: idee.categorie.couleur,
                },
              ]}
            />
          </div>
        </section>
      )}
    </article>
  );
}
