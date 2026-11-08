export type Coordonnees = { latitude: number; longitude: number };
/** Mètres autour du lieu de l'idée : x vers l'est, y vers le nord. */
export type Plan = { x: number; y: number };
export type Batiment = { contour: [number, number][]; hauteur: number };
export type Tuile = { colonne: number; ligne: number; zoom: number; ouest: number; est: number; sud: number; nord: number };
export type Place = Plan & { angle: number };

const METRES_PAR_DEGRE = 111_320;

export function versPlan(origine: Coordonnees, latitude: number, longitude: number): Plan {
  const parallele = Math.cos((origine.latitude * Math.PI) / 180);
  return {
    x: (longitude - origine.longitude) * METRES_PAR_DEGRE * parallele,
    y: (latitude - origine.latitude) * METRES_PAR_DEGRE,
  };
}

/** Dalles de photo aérienne autour du lieu, dans la grille Web Mercator. Au zoom 18, une dalle fait 100 m à Dijon. */
export function tuilesAutour(origine: Coordonnees, rayon = 2, zoom = 18): Tuile[] {
  const n = 2 ** zoom;
  const radians = (origine.latitude * Math.PI) / 180;
  const colonne = Math.floor(((origine.longitude + 180) / 360) * n);
  const ligne = Math.floor(((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * n);
  const longitudeDe = (c: number) => (c / n) * 360 - 180;
  const latitudeDe = (l: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * l) / n))) * 180) / Math.PI;

  const tuiles: Tuile[] = [];
  for (let c = colonne - rayon; c <= colonne + rayon; c++) {
    for (let l = ligne - rayon; l <= ligne + rayon; l++) {
      const nordOuest = versPlan(origine, latitudeDe(l), longitudeDe(c));
      const sudEst = versPlan(origine, latitudeDe(l + 1), longitudeDe(c + 1));
      tuiles.push({
        colonne: c,
        ligne: l,
        zoom,
        ouest: nordOuest.x,
        nord: nordOuest.y,
        est: sudEst.x,
        sud: sudEst.y,
      });
    }
  }
  return tuiles;
}

function dansContour({ x, y }: Plan, contour: [number, number][]) {
  let dedans = false;
  for (let i = 0, j = contour.length - 1; i < contour.length; j = i++) {
    const [xi, yi] = contour[i];
    const [xj, yj] = contour[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

export function dansUnBatiment(point: Plan, batiments: Batiment[]) {
  return batiments.some((b) => dansContour(point, b.contour));
}

/** Le mur le plus proche : sa distance, et son orientation pour aligner l'idée sur la rue. */
function murLePlusProche({ x, y }: Plan, batiments: Batiment[]) {
  let distance = Infinity;
  let angle = 0;
  for (const { contour } of batiments) {
    for (let i = 0, j = contour.length - 1; i < contour.length; j = i++) {
      const [ax, ay] = contour[j];
      const dx = contour[i][0] - ax;
      const dy = contour[i][1] - ay;
      const longueur = dx * dx + dy * dy;
      const t = longueur === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / longueur));
      const d = Math.hypot(x - ax - t * dx, y - ay - t * dy);
      if (d < distance) {
        distance = d;
        angle = Math.atan2(dy, dx);
      }
    }
  }
  return { distance, angle };
}

/**
 * La position d'une idée tombe parfois sur un toit : on cherche, en spirale, l'espace libre le plus proche
 * assez grand pour l'aménagement. À défaut, on garde l'endroit le plus dégagé.
 */
export function trouverPlace(batiments: Batiment[], rayon: number): Place {
  let meilleure: Place = { x: 0, y: 0, angle: 0 };
  let degagementMax = -1;

  for (let distance = 0; distance <= 72; distance += 6) {
    const essais = distance === 0 ? 1 : 12;
    for (let i = 0; i < essais; i++) {
      const direction = (i / essais) * 2 * Math.PI;
      const point = { x: distance * Math.cos(direction), y: distance * Math.sin(direction) };
      const mur = murLePlusProche(point, batiments);
      const degagement = dansUnBatiment(point, batiments) ? 0 : mur.distance;

      if (degagement > degagementMax) {
        degagementMax = degagement;
        meilleure = { ...point, angle: mur.distance === Infinity ? 0 : mur.angle };
      }
      if (degagement >= rayon) return meilleure;
    }
  }
  return meilleure;
}

/** Combien de bâtiments coupent la ligne de vue entre l'œil et la place. Être dans un mur disqualifie le point. */
function obstacles(place: Plan, oeil: Plan, hauteur: number, batiments: Batiment[]) {
  if (dansUnBatiment(oeil, batiments)) return Infinity;
  let total = 0;
  for (let t = 0.1; t < 1; t += 0.1) {
    const point = { x: place.x + (oeil.x - place.x) * t, y: place.y + (oeil.y - place.y) * t };
    total += batiments.filter((b) => b.hauteur > hauteur * t && dansContour(point, b.contour)).length;
  }
  return total;
}

/** D'où regarder l'idée sans qu'un immeuble la cache : on rapproche l'œil tant qu'aucun angle n'est dégagé. */
export function pointDeVue(place: Plan, distance: number, hauteur: number, batiments: Batiment[]): Plan {
  let meilleur: Plan = place;
  let moins = Infinity;

  for (const recul of [distance, distance * 0.75, distance * 0.5, distance * 0.3]) {
    for (let i = 0; i < 16; i++) {
      const direction = (i / 16) * 2 * Math.PI + 0.4;
      const oeil = { x: place.x + recul * Math.cos(direction), y: place.y + recul * Math.sin(direction) };
      const gene = obstacles(place, oeil, hauteur, batiments);
      if (gene === 0) return oeil;
      if (gene < moins) {
        moins = gene;
        meilleur = oeil;
      }
    }
  }
  return meilleur;
}
