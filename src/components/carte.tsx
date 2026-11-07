"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

export type Epingle = {
  id: number;
  titre: string;
  latitude: number;
  longitude: number;
  votesPour: number;
  votesContre: number;
  categorie: string;
  couleur: string;
};

export type Point = { latitude: number; longitude: number };

function icone(couleur: string) {
  const sure = /^#[0-9a-f]{6}$/i.test(couleur) ? couleur : "#1f4d3a";
  return L.divIcon({
    className: "",
    html: `<div class="epingle" style="background:${sure}"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 24],
    popupAnchor: [0, -24],
  });
}

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

function CadrerEpingles({ epingles }: { epingles: Epingle[] }) {
  const carte = useMap();
  useEffect(() => {
    if (epingles.length === 0) return;
    const limites = L.latLngBounds(epingles.map((e) => [e.latitude, e.longitude]));
    carte.fitBounds(limites, { padding: [36, 36], maxZoom: 15 });
  }, [carte, epingles]);
  return null;
}

type PropsIdees = { epingles: Epingle[]; centre: Point; zoom?: number };

export default function CarteIdees({ epingles, centre, zoom = 13 }: PropsIdees) {
  return (
    <SiVisible>
      <MapContainer center={[centre.latitude, centre.longitude]} zoom={zoom} className="h-full w-full">
        <Fond />
        <CadrerEpingles epingles={epingles} />
        {epingles.map((e) => (
          <Marker key={e.id} position={[e.latitude, e.longitude]} icon={icone(e.couleur)} title={e.titre}>
            <Popup>
              <p className="!m-0 text-xs text-gris">{e.categorie}</p>
              <Link href={`/idees/${e.id}`} className="font-semibold">
                {e.titre}
              </Link>
              <p className="!m-0 mt-1 text-xs">
                {e.votesPour} pour · {e.votesContre} contre
              </p>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </SiVisible>
  );
}

function Recentrer({ centre }: { centre: Point }) {
  const carte = useMap();
  useEffect(() => {
    carte.flyTo([centre.latitude, centre.longitude], 15, { duration: 0.6 });
  }, [carte, centre]);
  return null;
}

function CaptureClic({ onChange }: { onChange: (p: Point) => void }) {
  useMapEvents({
    click: (e) => onChange({ latitude: e.latlng.lat, longitude: e.latlng.lng }),
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
