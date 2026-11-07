"use client";

import dynamic from "next/dynamic";

// Leaflet a besoin de `window` : la carte n'est chargée que dans le navigateur.
const chargement = () => <div className="h-full w-full animate-pulse bg-trait/50" />;

export const CarteIdees = dynamic(() => import("@/components/carte"), {
  ssr: false,
  loading: chargement,
});

export const CarteChoixPosition = dynamic(
  () => import("@/components/carte").then((m) => m.CarteChoixPosition),
  { ssr: false, loading: chargement },
);
