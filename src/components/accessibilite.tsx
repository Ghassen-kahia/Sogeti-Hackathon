"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode, SyntheticEvent } from "react";
import {
  appliquerReglages,
  CLE_STOCKAGE,
  lirePreferences,
  PROFILS,
  REGLAGES_STANDARD,
  reglagesDesProfils,
  type IdProfil,
  type Preferences,
  type Reglages,
} from "@/lib/accessibilite";

const abonnes = new Set<() => void>();
// Si le navigateur bloque le stockage, le choix tient au moins jusqu'à la fermeture de la page.
let memoire: string | null = null;

function abonner(rappel: () => void) {
  abonnes.add(rappel);
  window.addEventListener("storage", rappel);
  return () => {
    abonnes.delete(rappel);
    window.removeEventListener("storage", rappel);
  };
}

function lire() {
  try {
    return localStorage.getItem(CLE_STOCKAGE) ?? memoire;
  } catch {
    return memoire;
  }
}

function enregistrer(preferences: Preferences) {
  memoire = JSON.stringify(preferences);
  try {
    localStorage.setItem(CLE_STOCKAGE, memoire);
  } catch {
    // Le choix reste en mémoire.
  }
  abonnes.forEach((rappel) => rappel());
}

export function Accessibilite() {
  // undefined côté serveur : la question ne se pose qu'une fois dans le navigateur.
  const sauvegarde = useSyncExternalStore(abonner, lire, () => undefined);
  const [ouvert, setOuvert] = useState(false);

  const preferences = lirePreferences(sauvegarde);
  const premiereVisite = sauvegarde !== undefined && preferences === null;

  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={() => setOuvert(true)} className="bouton-contour">
        <span aria-hidden>Aa</span>
        <span className="sr-only sm:not-sr-only sm:ml-1.5">Accessibilité</span>
      </button>
      {(ouvert || premiereVisite) && (
        <Panneau initiales={preferences} obligatoire={premiereVisite} onFerme={() => setOuvert(false)} />
      )}
    </>
  );
}

type PropsPanneau = { initiales: Preferences | null; obligatoire: boolean; onFerme: () => void };

function Panneau({ initiales, obligatoire, onFerme }: PropsPanneau) {
  const dialogue = useRef<HTMLDialogElement>(null);
  const [preferences, setPreferences] = useState<Preferences>(
    initiales ?? { profils: [], reglages: REGLAGES_STANDARD },
  );

  useEffect(() => {
    dialogue.current?.showModal();
  }, []);

  // L'effet est visible tout de suite : la personne juge sur pièce avant de valider.
  function changer(suivantes: Preferences) {
    setPreferences(suivantes);
    appliquerReglages(suivantes.reglages);
  }

  function basculerProfil(id: IdProfil) {
    const { profils } = preferences;
    const suivants = profils.includes(id) ? profils.filter((p) => p !== id) : [...profils, id];
    changer({ profils: suivants, reglages: reglagesDesProfils(suivants) });
  }

  function regler(modifs: Partial<Reglages>) {
    changer({ ...preferences, reglages: { ...preferences.reglages, ...modifs } });
  }

  function valider(choix: Preferences) {
    appliquerReglages(choix.reglages);
    enregistrer(choix);
    onFerme();
  }

  function annuler() {
    appliquerReglages(initiales?.reglages ?? REGLAGES_STANDARD);
    onFerme();
  }

  function touchesEchap(e: SyntheticEvent) {
    e.preventDefault();
    if (!obligatoire) annuler();
  }

  const { reglages } = preferences;

  return (
    <dialog
      ref={dialogue}
      aria-labelledby="titre-accessibilite"
      onCancel={touchesEchap}
      className="panneau-accessibilite"
    >
      <h2 id="titre-accessibilite" className="font-titre text-2xl font-semibold text-foret sm:text-3xl">
        {obligatoire ? "Bienvenue ! Comment adapter le site pour vous ?" : "Accessibilité"}
      </h2>
      <p className="mt-2 text-gris">
        Ce choix reste sur cet appareil : il n&apos;est ni envoyé, ni enregistré sur nos serveurs. Vous pourrez le
        changer à tout moment avec le bouton Accessibilité, en haut de chaque page.
      </p>

      <button
        type="button"
        onClick={() => valider({ profils: [], reglages: REGLAGES_STANDARD })}
        className="bouton-plein mt-5 w-full"
      >
        Je n&apos;ai pas besoin d&apos;adaptation
      </button>

      <fieldset className="mt-6">
        <legend className="libelle">Ou choisissez ce qui vous correspond (plusieurs choix possibles)</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {PROFILS.map((profil) => (
            <label key={profil.id} className="carte-profil">
              <input
                type="checkbox"
                checked={preferences.profils.includes(profil.id)}
                onChange={() => basculerProfil(profil.id)}
                className="mt-1 size-5 shrink-0 accent-foret"
              />
              <span>
                <span className="block font-semibold">{profil.titre}</span>
                <span className="block text-sm text-gris">{profil.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <details className="mt-5">
        <summary className="cursor-pointer font-semibold text-foret">Régler chaque option</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="a11y-taille" className="libelle">
              Taille du texte
            </label>
            <select
              id="a11y-taille"
              value={reglages.taille}
              onChange={(e) => regler({ taille: e.target.value as Reglages["taille"] })}
              className="champ"
            >
              <option value="normal">Normale</option>
              <option value="grand">Grande</option>
              <option value="tres-grand">Très grande</option>
            </select>
          </div>
          <div>
            <label htmlFor="a11y-police" className="libelle">
              Police
            </label>
            <select
              id="a11y-police"
              value={reglages.police}
              onChange={(e) => regler({ police: e.target.value as Reglages["police"] })}
              className="champ"
            >
              <option value="standard">Standard</option>
              <option value="dyslexie">Adaptée à la dyslexie (Lexend, espacée)</option>
              <option value="lisible">Très lisible (Atkinson Hyperlegible)</option>
            </select>
          </div>
        </div>
        <div className="mt-3 grid gap-1 sm:grid-cols-2">
          <Option actif={reglages.contraste} onChange={(contraste) => regler({ contraste })}>
            Contraste renforcé
          </Option>
          <Option actif={reglages.liens} onChange={(liens) => regler({ liens })}>
            Souligner les liens
          </Option>
          <Option actif={reglages.cibles} onChange={(cibles) => regler({ cibles })}>
            Boutons plus grands
          </Option>
          <Option actif={reglages.focus} onChange={(focus) => regler({ focus })}>
            Repère clavier très visible
          </Option>
          <Option actif={reglages.animations} onChange={(animations) => regler({ animations })}>
            Supprimer les animations
          </Option>
          <Option actif={reglages.carte} onChange={(carte) => regler({ carte })}>
            Masquer les cartes
          </Option>
          <Option actif={reglages.lecture} onChange={(lecture) => regler({ lecture })}>
            Lecture à voix haute des idées
          </Option>
        </div>
      </details>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        {!obligatoire && (
          <button type="button" onClick={annuler} className="bouton-contour">
            Annuler
          </button>
        )}
        <button type="button" onClick={() => valider(preferences)} className="bouton-plein">
          Valider mes choix
        </button>
      </div>
    </dialog>
  );
}

type PropsOption = { actif: boolean; onChange: (actif: boolean) => void; children: ReactNode };

function Option({ actif, onChange, children }: PropsOption) {
  return (
    <label className="flex items-center gap-2.5 py-1 text-sm">
      <input
        type="checkbox"
        checked={actif}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 shrink-0 accent-foret"
      />
      {children}
    </label>
  );
}
