import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  dansUnBatiment,
  pointDeVue,
  trouverPlace,
  tuilesAutour,
  type Batiment,
  type Coordonnees,
  type Place,
  type Tuile,
} from "@/lib/visite/geometrie";
import { construire } from "@/lib/visite/modeles";
import type { Scenario } from "@/lib/visite/scenarios";

export type DonneesVisite = { origine: Coordonnees; batiments: Batiment[]; scenario: Scenario; titre: string };
export type Vue = "ensemble" | "pied";
export type Action = "avancer" | "reculer" | "gauche" | "droite";
export type Visite = {
  afficherIdee: (visible: boolean) => void;
  changerVue: (vue: Vue) => void;
  agir: (action: Action) => void;
  detruire: () => void;
};

const CIEL = 0xc4dff0;
const HAUTEUR_YEUX = 1.65;
const VITESSE_MARCHE = 6;
const VITESSE_ROTATION = 1.5;
const DUREE_APPUI = 0.45;

const TOUCHES: Record<string, Action> = {
  ArrowUp: "avancer",
  z: "avancer",
  w: "avancer",
  ArrowDown: "reculer",
  s: "reculer",
  ArrowLeft: "gauche",
  q: "gauche",
  a: "gauche",
  ArrowRight: "droite",
  d: "droite",
};

function urlTuile({ colonne, ligne, zoom }: Tuile) {
  const parametres = new URLSearchParams({
    SERVICE: "WMTS",
    REQUEST: "GetTile",
    VERSION: "1.0.0",
    LAYER: "ORTHOIMAGERY.ORTHOPHOTOS",
    STYLE: "normal",
    TILEMATRIXSET: "PM",
    FORMAT: "image/jpeg",
    TILEMATRIX: String(zoom),
    TILEROW: String(ligne),
    TILECOL: String(colonne),
  });
  return `https://data.geopf.fr/wmts?${parametres}`;
}

function creerSol(scene: THREE.Scene, origine: Coordonnees, anisotropie: number) {
  const fond = new THREE.Mesh(
    new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0x8f9a7e }),
  );
  fond.position.y = -0.1;
  scene.add(fond);

  const chargeur = new THREE.TextureLoader().setCrossOrigin("anonymous");
  for (const tuile of tuilesAutour(origine)) {
    const largeur = tuile.est - tuile.ouest;
    const hauteur = tuile.nord - tuile.sud;
    const matiere = new THREE.MeshLambertMaterial({ color: 0xffffff, visible: false });
    const dalle = new THREE.Mesh(new THREE.PlaneGeometry(largeur, hauteur).rotateX(-Math.PI / 2), matiere);
    dalle.position.set(tuile.ouest + largeur / 2, 0, -(tuile.sud + hauteur / 2));
    dalle.receiveShadow = true;
    scene.add(dalle);

    // Une dalle indisponible reste invisible : le fond neutre prend sa place.
    chargeur.load(urlTuile(tuile), (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = anisotropie;
      matiere.map = texture;
      matiere.visible = true;
      matiere.needsUpdate = true;
    });
  }
}

function creerBatiments(scene: THREE.Scene, batiments: Batiment[]) {
  const murs = [new THREE.Color(0xe8dfcf), new THREE.Color(0xdcd3c4), new THREE.Color(0xeee8dc), new THREE.Color(0xd6cfc4)];
  const toit = new THREE.Color(0x77706b);

  const geometries = batiments.flatMap(({ contour, hauteur }, rang) => {
    if (contour.length < 3) return [];
    const forme = new THREE.Shape(contour.map(([x, y]) => new THREE.Vector2(x, y)));
    const volume = new THREE.ExtrudeGeometry(forme, { depth: hauteur, bevelEnabled: false }).rotateX(-Math.PI / 2);
    const normales = volume.getAttribute("normal");
    const couleurs = new Float32Array(normales.count * 3);
    for (let i = 0; i < normales.count; i++) {
      (normales.getY(i) > 0.5 ? toit : murs[rang % murs.length]).toArray(couleurs, i * 3);
    }
    volume.setAttribute("color", new THREE.BufferAttribute(couleurs, 3));
    return [volume];
  });
  if (geometries.length === 0) return;

  const ville = new THREE.Mesh(mergeGeometries(geometries), new THREE.MeshLambertMaterial({ vertexColors: true }));
  ville.castShadow = true;
  ville.receiveShadow = true;
  scene.add(ville);
  geometries.forEach((g) => g.dispose());
}

function creerEtiquette(titre: string) {
  const toile = document.createElement("canvas");
  toile.width = 1024;
  toile.height = 200;
  const contexte = toile.getContext("2d")!;
  contexte.fillStyle = "#1f4d3a";
  contexte.beginPath();
  contexte.roundRect(4, 4, 1016, 192, 36);
  contexte.fill();
  contexte.fillStyle = "#ffffff";
  contexte.font = "600 54px system-ui, sans-serif";
  contexte.textAlign = "center";
  contexte.textBaseline = "middle";

  const lignes = [""];
  for (const mot of titre.split(" ")) {
    const essai = `${lignes.at(-1)} ${mot}`.trim();
    if (contexte.measureText(essai).width < 940) lignes[lignes.length - 1] = essai;
    else lignes.push(mot);
  }
  const visibles = lignes.slice(0, 2);
  if (lignes.length > 2) visibles[1] += "…";
  visibles.forEach((ligne, i) => contexte.fillText(ligne, 512, 100 + (i - (visibles.length - 1) / 2) * 68));

  const texture = new THREE.CanvasTexture(toile);
  texture.colorSpace = THREE.SRGBColorSpace;
  const etiquette = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  etiquette.scale.set(17, 3.3, 1);
  etiquette.renderOrder = 1;
  return etiquette;
}

function creerIdee({ scenario, batiments, titre }: DonneesVisite, place: Place) {
  const idee = new THREE.Group();
  const cosinus = Math.cos(place.angle);
  const sinus = Math.sin(place.angle);

  for (const element of scenario.elements) {
    // x suit le mur voisin : on repasse dans le plan du terrain, le nord étant -z dans la scène.
    const x = place.x + element.x * cosinus + element.z * sinus;
    const y = place.y + element.x * sinus - element.z * cosinus;
    if (dansUnBatiment({ x, y }, batiments)) continue;

    const objet = construire(element);
    objet.position.set(x, 0, -y);
    objet.rotation.y = place.angle + (element.angle ?? 0);
    idee.add(objet);
  }

  const etiquette = creerEtiquette(titre);
  etiquette.position.set(place.x, 11, -place.y);
  idee.add(etiquette);
  return { idee, etiquette };
}

function creerRepere(place: Place, rayon: number) {
  const repere = new THREE.Mesh(
    new THREE.RingGeometry(rayon, rayon + 0.35, 64).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85 }),
  );
  repere.position.set(place.x, 0.09, -place.y);
  return repere;
}

export function creerVisite(toile: HTMLCanvasElement, donnees: DonneesVisite): Visite {
  const { batiments, scenario, origine } = donnees;
  const place = trouverPlace(batiments, scenario.rayon);

  const rendu = new THREE.WebGLRenderer({ canvas: toile, antialias: true });
  rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  rendu.shadowMap.enabled = true;
  rendu.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CIEL);
  scene.fog = new THREE.Fog(CIEL, 280, 620);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8d8a7c, 1.7));
  const soleil = new THREE.DirectionalLight(0xfff4e0, 2.1);
  soleil.position.set(place.x + 90, 150, -place.y + 70);
  soleil.target.position.set(place.x, 0, -place.y);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(2048, 2048);
  Object.assign(soleil.shadow.camera, { left: -170, right: 170, top: 170, bottom: -170, near: 10, far: 420 });
  soleil.shadow.normalBias = 0.4;
  scene.add(soleil, soleil.target);

  creerSol(scene, origine, rendu.capabilities.getMaxAnisotropy());
  creerBatiments(scene, batiments);
  const { idee, etiquette } = creerIdee(donnees, place);
  scene.add(idee, creerRepere(place, scenario.rayon));

  const camera = new THREE.PerspectiveCamera(55, 1, 0.3, 1500);
  const cible = new THREE.Vector3(place.x, 1, -place.y);
  const recul = Math.max(24, scenario.rayon * 1.8);
  const hauteurVol = recul * 0.9;
  const survol = pointDeVue(place, recul, hauteurVol, batiments);
  const depart = new THREE.Vector3(survol.x, hauteurVol, -survol.y);

  const orbite = new OrbitControls(camera, toile);
  orbite.enableDamping = true;
  orbite.enablePan = false;
  orbite.minDistance = 8;
  orbite.maxDistance = 260;
  orbite.maxPolarAngle = Math.PI / 2 - 0.04;

  const pieton = { x: 0, z: 0, lacet: 0, tangage: 0 };
  let vue: Vue = "ensemble";

  function placerPieton() {
    const vers = pointDeVue(place, scenario.rayon + 5, HAUTEUR_YEUX, batiments);
    pieton.x = vers.x;
    pieton.z = -vers.y;
    pieton.lacet = Math.atan2(-(cible.x - pieton.x), -(cible.z - pieton.z));
    pieton.tangage = 0;
  }

  function changerVue(suivante: Vue) {
    vue = suivante;
    orbite.enabled = vue === "ensemble";
    // À hauteur d'homme, l'étiquette flotterait au ras du cadre.
    etiquette.visible = vue === "ensemble";
    if (vue === "pied") placerPieton();
    else {
      camera.position.copy(depart);
      orbite.target.copy(cible);
      orbite.update();
    }
  }

  function bouger(action: Action, duree: number) {
    const sens = action === "avancer" || action === "gauche" ? 1 : -1;
    const tourne = action === "gauche" || action === "droite";

    if (vue === "pied") {
      if (tourne) pieton.lacet += sens * VITESSE_ROTATION * duree;
      else {
        const x = pieton.x - Math.sin(pieton.lacet) * sens * VITESSE_MARCHE * duree;
        const z = pieton.z - Math.cos(pieton.lacet) * sens * VITESSE_MARCHE * duree;
        // On ne traverse pas les murs.
        if (!dansUnBatiment({ x, y: -z }, batiments)) Object.assign(pieton, { x, z });
      }
      return;
    }

    const ecart = camera.position.clone().sub(orbite.target);
    if (tourne) ecart.applyAxisAngle(THREE.Object3D.DEFAULT_UP, sens * VITESSE_ROTATION * duree);
    else {
      const distance = ecart.length() * (1 - sens * 0.9 * duree);
      ecart.setLength(THREE.MathUtils.clamp(distance, orbite.minDistance, orbite.maxDistance));
    }
    camera.position.copy(orbite.target).add(ecart);
  }

  const enfoncees = new Set<Action>();
  function touchePressee(e: KeyboardEvent) {
    const action = TOUCHES[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (!action) return;
    e.preventDefault();
    enfoncees.add(action);
  }
  function toucheRelachee(e: KeyboardEvent) {
    const action = TOUCHES[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (action) enfoncees.delete(action);
  }
  const toutRelacher = () => enfoncees.clear();

  let glisse: { x: number; y: number } | null = null;
  function glissementDebut(e: PointerEvent) {
    if (vue === "pied") glisse = { x: e.clientX, y: e.clientY };
  }
  function glissement(e: PointerEvent) {
    if (!glisse) return;
    pieton.lacet += (e.clientX - glisse.x) * 0.004;
    pieton.tangage = THREE.MathUtils.clamp(pieton.tangage + (e.clientY - glisse.y) * 0.004, -1.2, 1.2);
    glisse = { x: e.clientX, y: e.clientY };
  }
  const glissementFin = () => {
    glisse = null;
  };

  toile.addEventListener("keydown", touchePressee);
  toile.addEventListener("keyup", toucheRelachee);
  toile.addEventListener("blur", toutRelacher);
  toile.addEventListener("pointerdown", glissementDebut);
  window.addEventListener("pointermove", glissement);
  window.addEventListener("pointerup", glissementFin);

  const observateur = new ResizeObserver(() => {
    const { clientWidth: largeur, clientHeight: hauteur } = toile;
    if (largeur === 0 || hauteur === 0) return;
    rendu.setSize(largeur, hauteur, false);
    camera.aspect = largeur / hauteur;
    camera.updateProjectionMatrix();
  });
  observateur.observe(toile);

  const horloge = new THREE.Timer();
  rendu.setAnimationLoop((instant) => {
    horloge.update(instant);
    const duree = Math.min(horloge.getDelta(), 0.1);
    enfoncees.forEach((action) => bouger(action, duree));

    if (vue === "pied") {
      camera.position.set(pieton.x, HAUTEUR_YEUX, pieton.z);
      camera.rotation.set(pieton.tangage, pieton.lacet, 0, "YXZ");
    } else orbite.update();

    rendu.render(scene, camera);
  });

  changerVue("ensemble");

  return {
    afficherIdee: (visible) => {
      idee.visible = visible;
    },
    changerVue,
    agir: (action) => bouger(action, DUREE_APPUI),
    detruire: () => {
      rendu.setAnimationLoop(null);
      observateur.disconnect();
      orbite.dispose();
      toile.removeEventListener("keydown", touchePressee);
      toile.removeEventListener("keyup", toucheRelachee);
      toile.removeEventListener("blur", toutRelacher);
      toile.removeEventListener("pointerdown", glissementDebut);
      window.removeEventListener("pointermove", glissement);
      window.removeEventListener("pointerup", glissementFin);

      scene.traverse((objet) => {
        if (!(objet instanceof THREE.Mesh || objet instanceof THREE.Sprite)) return;
        objet.geometry.dispose();
        const matiere = objet.material as THREE.MeshLambertMaterial;
        matiere.map?.dispose();
        matiere.dispose();
      });
      rendu.dispose();
    },
  };
}
