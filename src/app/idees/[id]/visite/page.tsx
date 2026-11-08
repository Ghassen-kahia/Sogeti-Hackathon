import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BoutonJaime } from "@/components/jaime";
import { Visite3D } from "@/components/visite-lazy";
import { getMesLikes, getSuggestion } from "@/lib/queries";
import { estModerateur, getUtilisateur } from "@/lib/session";
import { estIdValide } from "@/lib/validation";
import { chargerBatiments } from "@/lib/visite/batiments";
import { choisirScenario } from "@/lib/visite/scenarios";

export default function PageVisite({ params }: PageProps<"/idees/[id]/visite">) {
  return (
    <div className="py-8">
      <Suspense
        fallback={
          <div role="status" className="grid h-[60vh] animate-pulse place-items-center rounded-2xl bg-trait/50">
            Chargement du terrain…
          </div>
        }
      >
        <Visite params={params} />
      </Suspense>
    </div>
  );
}

async function Visite({ params }: { params: PageProps<"/idees/[id]/visite">["params"] }) {
  const id = Number((await params).id);
  if (!estIdValide(id)) notFound();

  const [idee, utilisateur, moderateur] = await Promise.all([getSuggestion(id), getUtilisateur(), estModerateur()]);
  if (!idee) notFound();

  const publiee = idee.statut === "PUBLIEE";
  if (!publiee && utilisateur?.id !== idee.auteurId && !moderateur) notFound();

  // Sans position précise, la visite se fait au centre du quartier.
  const precise = idee.latitude !== null && idee.longitude !== null;
  const origine = {
    latitude: idee.latitude ?? idee.localisation.latitude,
    longitude: idee.longitude ?? idee.localisation.longitude,
  };

  const [batiments, mesLikes] = await Promise.all([chargerBatiments(origine), getMesLikes(utilisateur?.id, [id])]);
  const scenario = choisirScenario(idee.titre, idee.description, idee.categorie.slug);

  return (
    <>
      <Link href={`/idees/${id}`} className="text-sm text-gris hover:text-encre hover:underline">
        ← Retour à l&apos;idée
      </Link>
      <h1 className="mt-3 mb-4 font-titre text-2xl leading-tight font-semibold text-foret sm:text-3xl">{idee.titre}</h1>

      <Visite3D donnees={{ origine, batiments, scenario, titre: idee.titre }} />

      <section className="mt-6 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          <h2 className="font-titre text-lg font-semibold">Ce que montre la simulation</h2>
          <p className="mt-1">{scenario.resume}</p>
          <p className="mt-3 text-sm text-gris">
            Illustration indicative, générée automatiquement à partir du texte de l&apos;idée : ce n&apos;est pas un
            projet d&apos;aménagement. La photo aérienne et les bâtiments sont réels, le sol est représenté à plat.
            {precise
              ? " L'aménagement est placé sur l'espace libre le plus proche de la position indiquée."
              : ` Cette idée n'a pas de position précise : elle est montrée près du centre de ${idee.localisation.nom}.`}
          </p>
          {batiments.length === 0 && (
            <p role="status" className="mt-3 text-sm text-tomate">
              Les bâtiments n&apos;ont pas pu être chargés. Rechargez la page pour réessayer.
            </p>
          )}
          <p className="mt-3 text-xs text-gris">
            Photo aérienne et bâtiments :{" "}
            <a href="https://geoservices.ign.fr/" className="underline" target="_blank" rel="noreferrer">
              IGN, Géoplateforme
            </a>{" "}
            (BD ORTHO, BD TOPO).
          </p>
        </div>
        {publiee && (
          <BoutonJaime
            suggestionId={id}
            likes={idee.likes}
            aime={mesLikes.has(id)}
            connecte={Boolean(utilisateur)}
          />
        )}
      </section>
    </>
  );
}
