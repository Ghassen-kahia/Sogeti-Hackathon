"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { createElementObject, createLayerComponent, extendContext } from "@react-leaflet/core";
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { Pictogramme } from "@/components/pictogramme";
import { htmlEpingle } from "@/lib/pictogrammes";

export type Epingle = {
  id: number;
  titre: string;
  latitude: number;
  longitude: number;
  likes: number;
  categorie: string;
  slug: string;
  couleur: string;
};

export type Point = { latitude: number; longitude: number };

function icone(couleur: string, slug?: string, nom?: string) {
  return L.divIcon({
    className: "",
    html: htmlEpingle(couleur, slug, nom),
    iconSize: [38, 46],
    iconAnchor: [19, 45],
    popupAnchor: [0, -42],
    tooltipAnchor: [0, -42],
  });
}

function iconeGrappe(grappe: L.MarkerCluster) {
  const nombre = grappe.getChildCount();
  return L.divIcon({
    className: "",
    html: `<div class="grappe">${nombre}<span class="sr-only"> idées ici : zoomer</span></div>`,
    iconSize: [42, 42],
  });
}

function sansAnimation() {
  return (
    document.documentElement.dataset.a11yAnimations === "true" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Les épingles proches sont regroupées : aucune ne se cache sous une autre, un clic sur le groupe zoome. */
const Grappes = createLayerComponent<L.MarkerClusterGroup, { children: ReactNode }>(function creer(_, contexte) {
  const groupe = L.markerClusterGroup({
    iconCreateFunction: iconeGrappe,
    maxClusterRadius: 44,
    showCoverageOnHover: false,
    animate: !sansAnimation(),
  });
  return createElementObject(groupe, extendContext(contexte, { layerContainer: groupe }));
});

/**
 * Next garde les routes quittées montées mais cachées (<Activity>) : leurs effets sont nettoyés, ce qui
 * détruit la carte Leaflet, puis rejoués au retour sur une instance morte, et la page plante.
 * On démonte donc la carte quand la route est cachée, pour en créer une neuve à son retour.
 */
function SiVisible({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'effet est le seul signal de visibilité d'Activity.
    setVisible(true);
    return () => setVisible(false);
  }, []);
  return visible ? children : null;
}

function Fond() {
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
  );
}

type PropsCadrage = { epingles: Epingle[]; centre: Point; zoom?: number };
type PropsIdees = PropsCadrage & { legende?: boolean };

function Cadrer({ epingles, centre, zoom = 13 }: PropsCadrage) {
  const carte = useMap();
  // Clé en texte : un vote rafraîchit la page avec de nouveaux tableaux, sans que la vue doive bouger.
  const cadrage = JSON.stringify({
    points: epingles.map((e) => [e.latitude, e.longitude]),
    repli: [centre.latitude, centre.longitude],
    zoom,
  });

  useEffect(() => {
    const { points, repli, zoom } = JSON.parse(cadrage) as {
      points: [number, number][];
      repli: [number, number];
      zoom: number;
    };
    if (points.length > 0) carte.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 15 });
    else carte.setView(repli, zoom);
  }, [carte, cadrage]);
  return null;
}

function Legende({ epingles, masquees, onBascule }: { epingles: Epingle[]; masquees: string[]; onBascule: (slug: string) => void }) {
  const categories = [...new Map(epingles.map((e) => [e.slug, e])).values()].sort((a, b) =>
    a.categorie.localeCompare(b.categorie, "fr"),
  );

  return (
    <div role="group" aria-label="Afficher ou masquer une catégorie sur la carte" className="legende-carte">
      {categories.map((c) => (
        <button
          key={c.slug}
          type="button"
          aria-pressed={!masquees.includes(c.slug)}
          onClick={() => onBascule(c.slug)}
          className="legende-entree"
        >
          <span className="legende-pastille" style={{ backgroundColor: c.couleur }}>
            <Pictogramme slug={c.slug} className="size-4" />
          </span>
          {c.categorie} ({epingles.filter((e) => e.slug === c.slug).length})
        </button>
      ))}
    </div>
  );
}

export default function CarteIdees({ epingles, centre, zoom = 13, legende = false }: PropsIdees) {
  const [masquees, setMasquees] = useState<string[]>([]);
  const visibles = epingles.filter((e) => !masquees.includes(e.slug));

  function basculer(slug: string) {
    setMasquees((liste) => (liste.includes(slug) ? liste.filter((s) => s !== slug) : [...liste, slug]));
  }

  return (
    <SiVisible>
      <div className="flex h-full flex-col">
        <MapContainer center={[centre.latitude, centre.longitude]} zoom={zoom} className="min-h-0 w-full flex-1">
          <Fond />
          <Cadrer epingles={epingles} centre={centre} zoom={zoom} />
          <Grappes>
            {visibles.map((e) => (
              <Marker
                key={e.id}
                position={[e.latitude, e.longitude]}
                icon={icone(e.couleur, e.slug, `${e.categorie} : ${e.titre}`)}
              >
                <Tooltip direction="top">
                  <strong>{e.categorie}</strong>
                  <br />
                  {e.titre}
                </Tooltip>
                <Popup>
                  <p className="!m-0 text-xs text-gris">{e.categorie}</p>
                  <Link href={`/idees/${e.id}`} className="font-semibold">
                    {e.titre}
                  </Link>
                  <p className="!m-0 mt-1 text-xs">
                    {e.likes} j&apos;aime · <Link href={`/idees/${e.id}/visite`}>Visiter en 3D</Link>
                  </p>
                </Popup>
              </Marker>
            ))}
          </Grappes>
        </MapContainer>
        {legende && epingles.length > 0 && <Legende epingles={epingles} masquees={masquees} onBascule={basculer} />}
      </div>
    </SiVisible>
  );
}

function Recentrer({ centre }: { centre: Point }) {
  const carte = useMap();
  useEffect(() => {
    if (sansAnimation()) carte.setView([centre.latitude, centre.longitude], 15);
    else carte.flyTo([centre.latitude, centre.longitude], 15, { duration: 0.6 });
  }, [carte, centre]);
  return null;
}

function CaptureClic({ onChange }: { onChange: (p: Point) => void }) {
  useMapEvents({
    // La carte se répète à l'infini : wrap() ramène le clic entre -180 et 180 degrés.
    click: (e) => {
      const { lat, lng } = e.latlng.wrap();
      onChange({ latitude: lat, longitude: lng });
    },
  });
  return null;
}

type PropsChoix = { centre: Point; position: Point | null; onChange: (p: Point) => void };

export function CarteChoixPosition({ centre, position, onChange }: PropsChoix) {
  return (
    <SiVisible>
      <MapContainer center={[centre.latitude, centre.longitude]} zoom={13} className="h-full w-full">
        <Fond />
        <Recentrer centre={centre} />
        <CaptureClic onChange={onChange} />
        {position && <Marker position={[position.latitude, position.longitude]} icon={icone("#c43d22")} />}
      </MapContainer>
    </SiVisible>
  );
}
