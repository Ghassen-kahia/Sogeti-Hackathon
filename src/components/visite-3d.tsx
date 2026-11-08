"use client";

import { useEffect, useRef, useState } from "react";
import { creerVisite, type Action, type DonneesVisite, type Visite, type Vue } from "@/lib/visite/scene";

const COMMANDES: { action: Action; libelle: string; symbole: string }[] = [
  { action: "gauche", libelle: "Tourner à gauche", symbole: "↺" },
  { action: "avancer", libelle: "Avancer", symbole: "↑" },
  { action: "reculer", libelle: "Reculer", symbole: "↓" },
  { action: "droite", libelle: "Tourner à droite", symbole: "↻" },
];

type PropsChoix<T> = {
  legende: string;
  valeur: T;
  options: [T, string][];
  onChange: (valeur: T) => void;
};

function Choix<T extends string | boolean>({ legende, valeur, options, onChange }: PropsChoix<T>) {
  return (
    <div role="group" aria-label={legende} className="choix-segmente">
      {options.map(([option, libelle]) => (
        <button key={libelle} type="button" aria-pressed={option === valeur} onClick={() => onChange(option)}>
          {libelle}
        </button>
      ))}
    </div>
  );
}

export default function Visite3D({ donnees }: { donnees: DonneesVisite }) {
  const toile = useRef<HTMLCanvasElement>(null);
  const visite = useRef<Visite | null>(null);
  // Un j'aime rafraîchit la page avec de nouvelles props : la scène ne doit pas se reconstruire pour autant.
  const [initiales] = useState(donnees);
  const [avecIdee, setAvecIdee] = useState(true);
  const [vue, setVue] = useState<Vue>("ensemble");
  const [indisponible, setIndisponible] = useState(false);

  useEffect(() => {
    try {
      const scene = creerVisite(toile.current!, initiales);
      visite.current = scene;
      return () => {
        scene.detruire();
        visite.current = null;
      };
    } catch (erreur) {
      console.error("Visite 3D indisponible :", erreur);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- WebGL ne peut être essayé qu'une fois le canvas monté.
      setIndisponible(true);
    }
  }, [initiales]);

  useEffect(() => visite.current?.afficherIdee(avecIdee), [avecIdee]);
  useEffect(() => visite.current?.changerVue(vue), [vue]);

  if (indisponible) {
    return (
      <p role="status" className="rounded-2xl border border-trait bg-carte p-5">
        Votre navigateur ne peut pas afficher la 3D (WebGL indisponible). Le texte ci-dessous décrit ce que montre la
        simulation.
      </p>
    );
  }

  return (
    <div>
      <div className="relative isolate h-[60vh] min-h-96 overflow-hidden rounded-2xl border border-trait bg-trait/50">
        <canvas
          ref={toile}
          tabIndex={0}
          role="application"
          aria-label={`Visite 3D : ${initiales.titre}`}
          aria-describedby="aide-visite"
          className="block h-full w-full"
        />
        <div className="absolute right-3 bottom-3 grid grid-cols-4 gap-1.5">
          {COMMANDES.map(({ action, libelle, symbole }) => (
            <button
              key={action}
              type="button"
              aria-label={libelle}
              title={libelle}
              onClick={() => visite.current?.agir(action)}
              className="commande-visite"
            >
              <span aria-hidden>{symbole}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        <Choix
          legende="Comparer"
          valeur={avecIdee}
          options={[
            [false, "Aujourd'hui"],
            [true, "Avec l'idée"],
          ]}
          onChange={setAvecIdee}
        />
        <Choix
          legende="Point de vue"
          valeur={vue}
          options={[
            ["ensemble", "Vue d'ensemble"],
            ["pied", "À pied"],
          ]}
          onChange={setVue}
        />
      </div>

      <p id="aide-visite" className="mt-2 text-sm text-gris">
        Faites glisser pour regarder autour de vous. Après avoir cliqué sur la scène, les flèches ou Z, Q, S, D
        permettent de se déplacer. Les boutons en bas à droite font la même chose.
      </p>
    </div>
  );
}
