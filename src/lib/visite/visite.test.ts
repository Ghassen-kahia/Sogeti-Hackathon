import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { dansUnBatiment, pointDeVue, trouverPlace, tuilesAutour, versPlan, type Batiment } from "./geometrie";
import { choisirScenario } from "./scenarios";

const carre = (x: number, y: number, cote: number): Batiment => ({
  hauteur: 10,
  contour: [
    [x, y],
    [x + cote, y],
    [x + cote, y + cote],
    [x, y + cote],
  ],
});

test("une idée tombée sur un toit est déplacée vers l'espace libre", () => {
  const batiments = [carre(-10, -10, 20)];
  const place = trouverPlace(batiments, 6);
  assert.equal(dansUnBatiment(place, batiments), false);
  assert.ok(Math.hypot(place.x, place.y) > 10);
});

test("sans bâtiment, l'idée reste exactement à sa position", () => {
  const place = trouverPlace([], 10);
  assert.deepEqual([place.x, place.y], [0, 0]);
});

test("le point de vue n'est jamais dans un bâtiment", () => {
  const batiments = [carre(5, -30, 60), carre(-30, 5, 30)];
  assert.equal(dansUnBatiment(pointDeVue({ x: 0, y: 0 }, 15, 1.65, batiments), batiments), false);
});

test("le point de vue évite l'immeuble qui cacherait l'idée", () => {
  // Un mur haut à l'est de la place : l'œil doit se placer ailleurs qu'à l'est.
  const batiments = [{ hauteur: 40, contour: [[6, -50], [12, -50], [12, 50], [6, 50]] as [number, number][] }];
  assert.ok(pointDeVue({ x: 0, y: 0 }, 30, 25, batiments).x < 6);
});

test("les dalles de photo aérienne couvrent le lieu et les bâtiments chargés", () => {
  const dijon = { latitude: 47.322, longitude: 5.0415 };
  const tuiles = tuilesAutour(dijon);
  assert.equal(tuiles.length, 25);
  assert.ok(Math.min(...tuiles.map((t) => t.ouest)) < -190);
  assert.ok(Math.max(...tuiles.map((t) => t.est)) > 190);
  assert.ok(Math.max(...tuiles.map((t) => t.nord)) > 190);
  assert.ok(Math.min(...tuiles.map((t) => t.sud)) < -190);
});

test("les distances sont en mètres", () => {
  const { x, y } = versPlan({ latitude: 47.322, longitude: 5.0415 }, 47.323, 5.0425);
  assert.ok(Math.abs(y - 111) < 1);
  assert.ok(Math.abs(x - 75) < 1);
});

test("le scénario correspond à l'idée, le plus précis l'emportant", () => {
  const cas: [string, string, string][] = [
    ["Une boîte à livres près de l'arrêt de tram", "culture", "livres"],
    ["Des cendriers et poubelles de tri aux arrêts de bus", "proprete", "tri"],
    ["Sécuriser le passage piéton devant le collège", "mobilite", "traversee"],
    ["Rendre piétonne la rue Monge le samedi", "commerces", "pietonne"],
    ["Un parcours de marche balisé pour les seniors", "sport-loisirs", "parcours"],
    ["Un marché de producteurs le jeudi soir", "commerces", "marche"],
    ["Des places vélo sécurisées à la gare", "mobilite", "velos"],
    ["Un abri pour attendre le car scolaire", "mobilite", "arret"],
    ["Une maison de santé pour le secteur est", "solidarite", "local"],
  ];
  for (const [titre, categorie, attendu] of cas) {
    assert.equal(choisirScenario(titre, "", categorie).id, attendu, titre);
  }
});

test("chaque idée du jeu de données a une simulation complète", () => {
  const { idees } = JSON.parse(readFileSync("prisma/donnees/idees-dijon.json", "utf8")) as {
    idees: { titre: string; description: string; categorie: string }[];
  };
  for (const idee of idees) {
    const scenario = choisirScenario(idee.titre, idee.description, idee.categorie);
    assert.ok(scenario.elements.length > 0, idee.titre);
    assert.ok(scenario.rayon > 0 && scenario.rayon <= 24, idee.titre);
  }
});
