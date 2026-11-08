import { cacheLife } from "next/cache";
import { versPlan, type Batiment, type Coordonnees } from "@/lib/visite/geometrie";

const DEMI_COTE_METRES = 190;
const MAX_BATIMENTS = 1000;

type Entite = {
  geometry?: { type?: string; coordinates?: number[][][][] };
  properties?: { hauteur?: number | null; nombre_d_etages?: number | null };
};

function hauteurDe({ properties }: Entite) {
  if (properties?.hauteur && properties.hauteur > 0) return Math.round(properties.hauteur * 10) / 10;
  if (properties?.nombre_d_etages && properties.nombre_d_etages > 0) return properties.nombre_d_etages * 3;
  return 6;
}

async function telecharger(origine: Coordonnees): Promise<Batiment[]> {
  "use cache";
  cacheLife("weeks");

  const { latitude, longitude } = origine;
  const dLat = DEMI_COTE_METRES / 111_320;
  const dLon = dLat / Math.cos((latitude * Math.PI) / 180);
  const bbox = [latitude - dLat, longitude - dLon, latitude + dLat, longitude + dLon].map((v) => v.toFixed(6));

  const url = new URL("https://data.geopf.fr/wfs/ows");
  url.search = new URLSearchParams({
    SERVICE: "WFS",
    VERSION: "2.0.0",
    REQUEST: "GetFeature",
    TYPENAMES: "BDTOPO_V3:batiment",
    OUTPUTFORMAT: "application/json",
    SRSNAME: "CRS:84",
    COUNT: String(MAX_BATIMENTS),
    PROPERTYNAME: "geometrie,hauteur,nombre_d_etages",
    BBOX: `${bbox.join(",")},urn:ogc:def:crs:EPSG::4326`,
  }).toString();

  const reponse = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!reponse.ok) throw new Error(`Géoplateforme : ${reponse.status}`);
  const { features } = (await reponse.json()) as { features?: Entite[] };
  if (!Array.isArray(features)) throw new Error("Géoplateforme : réponse inattendue");

  return features.flatMap((entite) => {
    if (entite.geometry?.type !== "MultiPolygon") return [];
    const hauteur = hauteurDe(entite);
    return (entite.geometry.coordinates ?? []).map(([exterieur]) => ({
      hauteur,
      // Le dernier point répète le premier. Au décimètre près, la réponse envoyée à la page reste légère.
      contour: exterieur.slice(0, -1).map(([lon, lat]): [number, number] => {
        const { x, y } = versPlan(origine, lat, lon);
        return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
      }),
    }));
  });
}

/** Bâtiments réels autour du lieu (IGN, BD TOPO). Sans réseau, la visite s'ouvre quand même, sans eux. */
export async function chargerBatiments(origine: Coordonnees) {
  try {
    return await telecharger(origine);
  } catch (erreur) {
    console.error("Bâtiments indisponibles :", erreur);
    return [];
  }
}
