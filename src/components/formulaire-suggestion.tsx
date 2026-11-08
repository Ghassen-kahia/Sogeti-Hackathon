"use client";

import { useMemo, useState, useTransition } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { creerSuggestion } from "@/app/actions";
import { CarteChoixPosition } from "@/components/carte-lazy";
import type { Point } from "@/components/carte";
import { exempleIdee } from "@/lib/exemples-idees";
import { grouperLieux, lieuParDefaut } from "@/lib/lieux";
import {
  EXTENSIONS_ACCEPTEES,
  MAX_FICHIERS,
  MAX_TAGS,
  TAILLE_MAX_FICHIER,
  type EtatSuggestion,
} from "@/lib/validation";

type Props = {
  categories: { id: number; nom: string; slug: string }[];
  quartiers: (Point & { id: number; nom: string; slug: string; ville: string })[];
  tagsExistants: string[];
};

export function FormulaireSuggestion({ categories, quartiers, tagsExistants }: Props) {
  const router = useRouter();
  const [etat, setEtat] = useState<EtatSuggestion>({});
  const [enCours, demarrer] = useTransition();
  const [categorieId, setCategorieId] = useState("");
  const [quartierId, setQuartierId] = useState("");
  const [position, setPosition] = useState<Point | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [saisieTag, setSaisieTag] = useState("");
  const [erreurFichiers, setErreurFichiers] = useState("");

  const centre = useMemo(() => {
    const choisi = quartiers.find((q) => String(q.id) === quartierId) ?? lieuParDefaut(quartiers);
    return { latitude: choisi?.latitude ?? 46.6, longitude: choisi?.longitude ?? 2.4 };
  }, [quartiers, quartierId]);

  const exemple = exempleIdee(categories.find((c) => String(c.id) === categorieId)?.slug);

  function ajouterTag(valeur: string, liste = tags) {
    const tag = valeur.trim().replace(/^#/, "").toLowerCase();
    setSaisieTag("");
    if (tag.length < 2 || liste.includes(tag) || liste.length >= MAX_TAGS) return liste;
    const suivante = [...liste, tag];
    setTags(suivante);
    return suivante;
  }

  function toucheTag(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      ajouterTag(saisieTag);
    }
  }

  function choisirFichiers(e: ChangeEvent<HTMLInputElement>) {
    const fichiers = Array.from(e.target.files ?? []);
    let message = "";
    if (fichiers.length > MAX_FICHIERS) message = `${MAX_FICHIERS} fichiers maximum.`;
    const tropGros = fichiers.find((f) => f.size > TAILLE_MAX_FICHIER);
    if (tropGros) message = `« ${tropGros.name} » dépasse 5 Mo.`;
    setErreurFichiers(message);
    if (message) e.target.value = "";
  }

  // Soumission manuelle : l'action native viderait le formulaire, fichiers compris, en cas d'erreur.
  // À l'inverse, après un succès il faut le vider nous-mêmes : Next garde la page montée après la navigation.
  function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formulaire = e.currentTarget;
    const donnees = new FormData(formulaire);
    ajouterTag(saisieTag).forEach((tag) => donnees.append("tags", tag));

    demarrer(async () => {
      const resultat = await creerSuggestion(donnees);
      if (resultat.id === undefined) {
        setEtat(resultat);
        return;
      }
      formulaire.reset();
      setEtat({});
      setTags([]);
      setPosition(null);
      setCategorieId("");
      setQuartierId("");
      router.push(`/idees/${resultat.id}`);
    });
  }

  const erreurs = etat.erreurs ?? {};

  return (
    <form onSubmit={soumettre} noValidate className="mt-8 space-y-6">
      <div>
        <label htmlFor="titre" className="libelle">
          Titre
        </label>
        <input
          id="titre"
          name="titre"
          maxLength={120}
          placeholder={exemple.titre}
          className="champ"
          aria-invalid={Boolean(erreurs.titre)}
        />
        {erreurs.titre && <p className="erreur">{erreurs.titre}</p>}
      </div>

      <div>
        <label htmlFor="description" className="libelle">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={6}
          maxLength={3000}
          placeholder={exemple.description}
          className="champ"
          aria-invalid={Boolean(erreurs.description)}
        />
        {erreurs.description && <p className="erreur">{erreurs.description}</p>}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="categorieId" className="libelle">
            Catégorie
          </label>
          <select
            id="categorieId"
            name="categorieId"
            value={categorieId}
            onChange={(e) => setCategorieId(e.target.value)}
            className="champ"
            aria-invalid={Boolean(erreurs.categorieId)}
          >
            <option value="" disabled>
              Choisir
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
          {erreurs.categorieId && <p className="erreur">{erreurs.categorieId}</p>}
        </div>

        <div>
          <label htmlFor="localisationId" className="libelle">
            Lieu
          </label>
          <select
            id="localisationId"
            name="localisationId"
            value={quartierId}
            onChange={(e) => setQuartierId(e.target.value)}
            className="champ"
            aria-invalid={Boolean(erreurs.localisationId)}
          >
            <option value="" disabled>
              Choisir
            </option>
            {grouperLieux(quartiers).map((groupe) => (
              <optgroup key={groupe.libelle} label={groupe.libelle}>
                {groupe.lieux.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.nom}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {erreurs.localisationId && <p className="erreur">{erreurs.localisationId}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="saisie-tag" className="libelle">
          Tags <span className="font-normal text-gris">(facultatif, {MAX_TAGS} maximum)</span>
        </label>
        <input
          id="saisie-tag"
          list="tags-existants"
          value={saisieTag}
          onChange={(e) => setSaisieTag(e.target.value)}
          onKeyDown={toucheTag}
          maxLength={30}
          disabled={tags.length >= MAX_TAGS}
          placeholder={exemple.tag}
          className="champ"
        />
        <datalist id="tags-existants">
          {tagsExistants.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        {tags.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag}>
                <button
                  type="button"
                  onClick={() => setTags(tags.filter((t) => t !== tag))}
                  aria-label={`Retirer le tag ${tag}`}
                  className="rounded-full bg-foret/10 px-3 py-1 text-sm text-foret hover:bg-foret/20"
                >
                  #{tag} ×
                </button>
              </li>
            ))}
          </ul>
        )}
        {erreurs.tags && <p className="erreur">{erreurs.tags}</p>}
      </div>

      <div className="carte-facultative">
        <p className="libelle">
          Emplacement <span className="font-normal text-gris">(facultatif)</span>
        </p>
        <p className="mb-2 text-sm text-gris">Cliquez sur la carte pour situer votre idée.</p>
        <div className="isolate h-72 overflow-hidden rounded-2xl border border-trait">
          <CarteChoixPosition centre={centre} position={position} onChange={setPosition} />
        </div>
        <input type="hidden" name="latitude" value={position?.latitude ?? ""} />
        <input type="hidden" name="longitude" value={position?.longitude ?? ""} />
        {position && (
          <button type="button" onClick={() => setPosition(null)} className="mt-2 text-sm text-gris underline">
            Retirer l&apos;emplacement
          </button>
        )}
        {erreurs.latitude && <p className="erreur">{erreurs.latitude}</p>}
      </div>

      <div>
        <label htmlFor="fichiers" className="libelle">
          Documents <span className="font-normal text-gris">(facultatif)</span>
        </label>
        <input
          id="fichiers"
          name="fichiers"
          type="file"
          multiple
          accept={EXTENSIONS_ACCEPTEES}
          onChange={choisirFichiers}
          className="champ file:mr-3 file:rounded-full file:border-0 file:bg-foret/10 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-foret"
        />
        <p className="mt-1.5 text-sm text-gris">
          PDF, image ou Word. {MAX_FICHIERS} fichiers maximum, 5 Mo par fichier.
        </p>
        {(erreurFichiers || erreurs.fichiers) && <p className="erreur">{erreurFichiers || erreurs.fichiers}</p>}
      </div>

      {etat.refus && (
        <div role="alert" className="rounded-2xl border border-tomate bg-tomate/10 p-4 text-sm">
          <p className="font-semibold">Votre idée n&apos;a pas été publiée :</p>
          <ul className="mt-1 list-inside list-disc">
            {etat.refus.map((raison) => (
              <li key={raison}>{raison}</li>
            ))}
          </ul>
        </div>
      )}

      {etat.erreur && (
        <p role="alert" className="erreur">
          {etat.erreur}
        </p>
      )}

      <p className="text-sm text-gris">
        Restez courtois et ne donnez pas de coordonnées personnelles. Chaque idée est vérifiée avant publication.
      </p>

      <button type="submit" disabled={enCours} className="bouton-plein w-full sm:w-auto">
        {enCours ? "Publication…" : "Publier mon idée"}
      </button>
    </form>
  );
}
