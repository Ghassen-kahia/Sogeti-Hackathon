import * as THREE from "three";
import type { Element, Modele } from "@/lib/visite/scenarios";

const BOIS = 0x9a6b3f;
const METAL = 0x4a5157;
const VERT = 0x3f8a4a;
const BLANC_MAT = 0xf4f4f0;
const TENUES = [0xc2502e, 0x2d6fa5, 0xd9a521, 0x7d4da0, 0x2f8f6a, 0xe0e0da];

const matieres = new Map<number, THREE.Material>();
function matiere(couleur: number) {
  if (!matieres.has(couleur)) matieres.set(couleur, new THREE.MeshLambertMaterial({ color: couleur }));
  return matieres.get(couleur)!;
}

function poser(groupe: THREE.Group, geometrie: THREE.BufferGeometry, couleur: number, x: number, y: number, z: number) {
  const objet = new THREE.Mesh(geometrie, matiere(couleur));
  objet.position.set(x, y, z);
  objet.castShadow = true;
  objet.receiveShadow = true;
  groupe.add(objet);
  return objet;
}

/** Posée par le bas : y est la hauteur de sa base. */
function boite(g: THREE.Group, l: number, h: number, p: number, couleur: number, x = 0, y = 0, z = 0) {
  return poser(g, new THREE.BoxGeometry(l, h, p), couleur, x, y + h / 2, z);
}

function tube(g: THREE.Group, r: number, h: number, couleur: number, x = 0, y = 0, z = 0) {
  return poser(g, new THREE.CylinderGeometry(r, r, h, 10), couleur, x, y + h / 2, z);
}

function boule(g: THREE.Group, r: number, couleur: number, x = 0, y = 0, z = 0) {
  return poser(g, new THREE.IcosahedronGeometry(r, 1), couleur, x, y, z);
}

function roue(g: THREE.Group, x: number, y: number, z: number, r = 0.33) {
  const objet = poser(g, new THREE.TorusGeometry(r, 0.03, 6, 18), 0x222222, x, y, z);
  objet.rotation.y = Math.PI / 2;
}

function velo(g: THREE.Group) {
  roue(g, 0, 0.33, -0.55);
  roue(g, 0, 0.33, 0.55);
  boite(g, 0.04, 0.05, 1.05, 0xc2502e, 0, 0.55, 0);
  boite(g, 0.04, 0.5, 0.04, 0xc2502e, 0, 0.35, -0.45);
  boite(g, 0.4, 0.03, 0.03, 0x222222, 0, 0.88, -0.45);
  boite(g, 0.14, 0.05, 0.25, 0x222222, 0, 0.82, 0.4);
}

function personne(g: THREE.Group, tenue: number) {
  tube(g, 0.13, 0.82, 0x2c3440, 0, 0, 0);
  tube(g, 0.2, 0.62, tenue, 0, 0.8, 0);
  boule(g, 0.14, 0xe0b48f, 0, 1.6, 0);
}

function tenueDe(e: Element) {
  return TENUES[Math.abs(Math.round(e.x * 3 + e.z * 7)) % TENUES.length];
}

function abriToit(g: THREE.Group, longueur: number, profondeur: number, hauteur: number, couleur: number) {
  for (const x of [-longueur / 2 + 0.1, longueur / 2 - 0.1]) tube(g, 0.05, hauteur, METAL, x, 0, -profondeur / 2 + 0.1);
  for (const x of [-longueur / 2 + 0.1, longueur / 2 - 0.1]) tube(g, 0.05, hauteur, METAL, x, 0, profondeur / 2 - 0.1);
  boite(g, longueur + 0.3, 0.1, profondeur + 0.3, couleur, 0, hauteur, 0);
}

const CONSTRUCTEURS: Record<Modele, (g: THREE.Group, e: Element) => void> = {
  "abri-bus": (g) => {
    abriToit(g, 5, 1.6, 2.5, 0x2d6fa5);
    boite(g, 5, 2.2, 0.05, 0xbcd8e6, 0, 0.1, 0.75);
    boite(g, 3, 0.08, 0.45, BOIS, 0, 0.46, 0.4);
  },
  "abri-velo": (g) => {
    abriToit(g, 8, 2.6, 2.4, 0x3f8a4a);
  },
  agres: (g) => {
    tube(g, 0.06, 2.3, METAL, -0.8);
    tube(g, 0.06, 2.3, METAL, 0.8);
    boite(g, 1.7, 0.06, 0.06, 0xd9a521, 0, 2.2, 0);
    boite(g, 1, 0.06, 0.06, 0xd9a521, 0, 1.3, 0);
  },
  arbre: (g, e) => {
    const taille = 0.85 + (Math.abs(Math.sin(e.x * 3.1 + e.z * 1.7)) % 1) * 0.4;
    tube(g, 0.16 * taille, 2.6 * taille, 0x6a4a30);
    boule(g, 1.7 * taille, VERT, 0, 3.6 * taille, 0);
    boule(g, 1.2 * taille, 0x559c52, 0.8 * taille, 3 * taille, 0.4 * taille);
    boule(g, 1.1 * taille, 0x34783f, -0.7 * taille, 3.2 * taille, -0.5 * taille);
  },
  arceau: (g) => {
    tube(g, 0.03, 0.8, METAL, -0.28);
    tube(g, 0.03, 0.8, METAL, 0.28);
    boite(g, 0.6, 0.05, 0.05, METAL, 0, 0.78, 0);
  },
  bac: (g) => {
    boite(g, 2.4, 0.5, 1.2, BOIS);
    boite(g, 2.25, 0.08, 1.05, 0x4b3524, 0, 0.47, 0);
    for (const x of [-0.8, -0.25, 0.3, 0.85]) boule(g, 0.24, 0x4f9e47, x, 0.72, 0);
  },
  banc: (g) => {
    boite(g, 1.8, 0.07, 0.45, BOIS, 0, 0.44, 0);
    boite(g, 1.8, 0.4, 0.06, BOIS, 0, 0.55, -0.22);
    boite(g, 0.08, 0.44, 0.42, METAL, -0.75);
    boite(g, 0.08, 0.44, 0.42, METAL, 0.75);
  },
  bande: (g, e) => {
    const objet = boite(g, e.longueur ?? 5, 0.06, e.largeur ?? 2, e.couleur ?? 0x888888);
    objet.castShadow = false;
  },
  borne: (g) => {
    boite(g, 0.4, 1.3, 0.25, 0x2f8f6a);
    boite(g, 0.28, 0.22, 0.02, 0xbcd8e6, 0, 0.95, 0.13);
  },
  "boite-livres": (g) => {
    tube(g, 0.08, 0.9, BOIS);
    boite(g, 1.2, 1.1, 0.55, BOIS, 0, 0.9, 0);
    boite(g, 1.05, 0.95, 0.03, 0xcfe4ec, 0, 0.97, 0.28);
    const toit = poser(g, new THREE.ConeGeometry(1, 0.5, 4), 0xa54b3e, 0, 2.25, 0);
    toit.rotation.y = Math.PI / 4;
    toit.scale.z = 0.55;
  },
  bus: (g) => {
    boite(g, 10, 2.5, 2.5, 0xe2e4e2, 0, 0.35, 0);
    boite(g, 9.6, 0.9, 2.53, 0x24323c, 0, 1.6, 0);
    boite(g, 10.02, 0.3, 2.52, 0x2f8f5b, 0, 0.8, 0);
    for (const x of [-3.2, 3.2]) {
      for (const z of [-1.2, 1.2]) {
        const objet = poser(g, new THREE.CylinderGeometry(0.45, 0.45, 0.3, 14), 0x1d1d1d, x, 0.45, z);
        objet.rotation.x = Math.PI / 2;
      }
    }
  },
  but: (g) => {
    tube(g, 0.06, 2.2, BLANC_MAT, -1.8);
    tube(g, 0.06, 2.2, BLANC_MAT, 1.8);
    boite(g, 3.7, 0.1, 0.1, BLANC_MAT, 0, 2.15, 0);
  },
  cabane: (g) => {
    boite(g, 2.6, 2.1, 2, BOIS);
    boite(g, 2.9, 0.12, 2.3, 0x56402d, 0, 2.1, 0);
    boite(g, 0.8, 1.7, 0.03, 0x6d4c30, 0, 0, 1.02);
  },
  composteur: (g) => {
    boite(g, 1.3, 1, 1.1, 0x7f8b4f);
    boite(g, 1.4, 0.08, 1.2, 0x56402d, 0, 1, 0);
  },
  cycliste: (g, e) => {
    velo(g);
    tube(g, 0.17, 0.6, tenueDe(e), 0, 0.95, 0.12);
    boule(g, 0.14, 0xe0b48f, 0, 1.68, 0.05);
  },
  ecran: (g) => {
    tube(g, 0.1, 5.2, METAL, -4.2);
    tube(g, 0.1, 5.2, METAL, 4.2);
    boite(g, 8.4, 4, 0.12, 0xf7f7f0, 0, 1.2, 0);
  },
  frigo: (g) => {
    abriToit(g, 2.4, 1.6, 2.5, 0xa54b3e);
    boite(g, 0.9, 1.8, 0.75, 0xe9f0f2, 0, 0, -0.2);
    boite(g, 0.04, 0.6, 0.04, METAL, 0.32, 0.8, 0.2);
  },
  "hotel-insectes": (g) => {
    boite(g, 2.2, 1.9, 0.5, BOIS, 0, 0.3, 0);
    tube(g, 0.08, 0.32, BOIS, -0.9);
    tube(g, 0.08, 0.32, BOIS, 0.9);
    boite(g, 2, 1.65, 0.04, 0xc99b5f, 0, 0.42, 0.26);
    boite(g, 2.6, 0.12, 0.8, 0x6a4a30, 0, 2.2, 0);
  },
  jardiniere: (g) => {
    boite(g, 1.6, 0.55, 0.7, BOIS);
    boule(g, 0.42, 0x4f9e47, -0.4, 0.8, 0);
    boule(g, 0.42, 0x65ae4d, 0.4, 0.8, 0);
  },
  lampadaire: (g) => {
    tube(g, 0.07, 5.5, METAL);
    boite(g, 0.9, 0.08, 0.14, METAL, 0.4, 5.45, 0);
    boite(g, 0.5, 0.06, 0.22, 0xfff0b8, 0.6, 5.39, 0);
  },
  "mur-peint": (g) => {
    const couleurs = [0xc2502e, 0xd9a521, 0x2f8f6a, 0x2d6fa5, 0x7d4da0, 0xe28a4a];
    couleurs.forEach((couleur, i) => {
      boite(g, 3, 3.6, 0.3, couleur, (i - 2.5) * 3, 0, 0);
      boule(g, 0.75, couleurs[(i + 2) % couleurs.length], (i - 2.5) * 3, 1.9, 0.14);
    });
  },
  panneau: (g) => {
    tube(g, 0.05, 2.4, METAL);
    boite(g, 0.9, 0.7, 0.05, 0x1f4d3a, 0, 1.75, 0);
    boite(g, 0.74, 0.1, 0.01, 0xf4f4f0, 0, 2.1, 0.03);
    boite(g, 0.74, 0.1, 0.01, 0xf4f4f0, 0, 1.9, 0.03);
  },
  pavillon: (g) => {
    boite(g, 9, 3.2, 5, 0xefe6d4);
    boite(g, 9.6, 0.25, 5.6, 0x3f6f58, 0, 3.2, 0);
    boite(g, 1.3, 2.3, 0.04, 0x2d6fa5, 0, 0, 2.52);
    for (const x of [-3, 3]) boite(g, 2, 1.4, 0.04, 0xbcd8e6, x, 1, 2.52);
  },
  personne: (g, e) => personne(g, tenueDe(e)),
  potelet: (g) => {
    tube(g, 0.07, 0.9, 0xf4f4f0);
    tube(g, 0.075, 0.14, 0xc2502e, 0, 0.62, 0);
  },
  poubelles: (g) => {
    [0xd9a521, 0x2f8f6a, 0x2d6fa5].forEach((couleur, i) => {
      boite(g, 0.6, 1.05, 0.6, couleur, (i - 1) * 0.72);
      boite(g, 0.64, 0.07, 0.64, 0x2c3440, (i - 1) * 0.72, 1.05, 0);
    });
  },
  rampe: (g) => {
    const profil = new THREE.Shape();
    profil.moveTo(-2.5, 0);
    profil.quadraticCurveTo(0.8, 0, 2.5, 1.6);
    profil.lineTo(2.5, 0);
    profil.closePath();
    const geometrie = new THREE.ExtrudeGeometry(profil, { depth: 5, bevelEnabled: false, curveSegments: 12 });
    geometrie.translate(0, 0, -2.5);
    const objet = poser(g, geometrie, 0x9b9b95, 0, 0, 0);
    objet.rotation.y = -Math.PI / 2;
  },
  scene: (g) => {
    boite(g, 9, 1, 5, 0x3a3f46);
    for (const x of [-4.3, 4.3]) tube(g, 0.1, 5, METAL, x, 1, -2.2);
    boite(g, 9, 0.3, 0.3, METAL, 0, 5.8, -2.2);
    boite(g, 8.4, 3.6, 0.1, 0x7d4da0, 0, 1.6, -2.3);
  },
  stand: (g, e) => {
    const toile = [0xc2502e, 0x2d6fa5, 0xd9a521, 0x2f8f6a][Math.abs(Math.round(e.x / 6)) % 4];
    abriToit(g, 4, 2.4, 2.4, toile);
    boite(g, 3.6, 0.9, 1, BOIS, 0, 0, 0);
    for (const x of [-1.2, -0.4, 0.4, 1.2]) boule(g, 0.2, x > 0 ? 0xd9722e : 0x6aa84f, x, 1.02, 0);
  },
  table: (g) => {
    tube(g, 0.04, 0.72, METAL);
    tube(g, 0.45, 0.04, 0xf4f4f0, 0, 0.72, 0);
    tube(g, 0.03, 2.3, METAL);
    poser(g, new THREE.ConeGeometry(1.5, 0.55, 8), 0xc2502e, 0, 2.5, 0);
    for (const x of [-0.8, 0.8]) boite(g, 0.38, 0.46, 0.38, 0x2d6fa5, x);
  },
  velo: (g) => velo(g),
  voiture: (g) => {
    boite(g, 1.8, 0.7, 4.2, 0x5d7890, 0, 0.3, 0);
    boite(g, 1.6, 0.6, 2.2, 0x24323c, 0, 1, 0.1);
  },
};

export function construire(element: Element) {
  const groupe = new THREE.Group();
  CONSTRUCTEURS[element.modele](groupe, element);
  return groupe;
}
