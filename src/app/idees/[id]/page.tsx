import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CarteIdees } from "@/components/carte-lazy";
import { BadgeCategorie, dateFr } from "@/components/idee-card";
import { ActionsModeration } from "@/components/actions-moderation";
import { LectureVoix } from "@/components/lecture-voix";
import { Signaler } from "@/components/signaler";
import { BoutonJaime } from "@/components/jaime";
import { getMesLikes, getSuggestion } from "@/lib/queries";
import { estModerateur, getUtilisateur } from "@/lib/session";
import { estIdValide } from "@/lib/validation";

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
  if (!estIdValide(id)) notFound();

  const [idee, utilisateur, moderateur] = await Promise.all([getSuggestion(id), getUtilisateur(), estModerateur()]);
  if (!idee) notFound();

  const publiee = idee.statut === "PUBLIEE";
  const auteur = utilisateur?.id === idee.auteurId;
  if (!publiee && !auteur && !moderateur) notFound();

  const mesLikes = await getMesLikes(utilisateur?.id, [id]);
  const images = idee.piecesJointes.filter((p) => p.typeMime.startsWith("image/"));
  const documents = idee.piecesJointes.filter((p) => !p.typeMime.startsWith("image/"));

  return (
    <article className="mt-6">
      {idee.statut === "EN_ATTENTE" && (
        <p role="status" className="mb-5 rounded-2xl border border-soleil bg-soleil/15 p-4 text-sm">
          <strong>En cours de vérification.</strong> Cette idée n&apos;est visible que par vous pour l&apos;instant. Un
          modérateur va la relire, elle sera publiée si elle respecte les règles de la plateforme.
        </p>
      )}
      {idee.statut === "REJETEE" && (
        <p role="status" className="mb-5 rounded-2xl border border-tomate bg-tomate/10 p-4 text-sm">
          <strong>Idée non publiée.</strong> {idee.noteModeration}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gris">
        <BadgeCategorie {...idee.categorie} />
        <span>{idee.localisation.nom}</span>
      </div>
      <h1 className="mt-3 font-titre text-3xl leading-tight font-semibold text-foret sm:text-4xl">{idee.titre}</h1>
      <p className="mt-2 text-sm text-gris">
        Par {idee.auteur.nickname}, le {dateFr(idee.createdAt)}
      </p>

      <p className="mt-6 leading-relaxed break-words whitespace-pre-line">{idee.description}</p>
      <LectureVoix texte={`${idee.titre}. ${idee.description}`} />

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

      <Link href={`/idees/${idee.id}/visite`} className="bouton-plein mt-6">
        Visiter en 3D sur le terrain
      </Link>

      {publiee && (
        <section className="mt-8 rounded-2xl border border-trait bg-carte p-5">
          <h2 className="mb-3 font-titre text-lg font-semibold">Cette idée vous plaît ?</h2>
          <BoutonJaime
            suggestionId={idee.id}
            likes={idee.likes}
            aime={mesLikes.has(idee.id)}
            connecte={Boolean(utilisateur)}
          />
        </section>
      )}

      {moderateur && (
        <section className="mt-6 rounded-2xl border border-trait bg-carte p-5">
          <h2 className="mb-3 font-titre text-lg font-semibold">Modération</h2>
          <ActionsModeration id={idee.id} statut={idee.statut} />
        </section>
      )}

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

      {idee.latitude !== null && idee.longitude !== null && publiee && (
        <section className="carte-facultative mt-8">
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
                  likes: idee.likes,
                  categorie: idee.categorie.nom,
                  slug: idee.categorie.slug,
                  couleur: idee.categorie.couleur,
                },
              ]}
            />
          </div>
        </section>
      )}

      {publiee && !auteur && <Signaler suggestionId={idee.id} connecte={Boolean(utilisateur)} />}
    </article>
  );
}
