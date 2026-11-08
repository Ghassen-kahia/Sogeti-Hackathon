import assert from "node:assert/strict";
import { test } from "node:test";
import { analyserTexte, pseudoInacceptable, trouverDoublon } from "./regles";

const idee = (description: string, titre = "Une idée pour le quartier", tags: string[] = []) =>
  analyserTexte({ titre, description, tags });

test("une idée normale passe, même si elle critique la mairie", () => {
  const verdict = idee(
    "La mairie ne fait rien depuis dix ans : le conseil de quartier réclame un vrai ramassage des ordures ménagères.",
  );
  assert.deepEqual(verdict, { gravite: "ok", motifs: [] });
});

test("les mots proches d'une insulte ne déclenchent rien", () => {
  for (const texte of ["Conduire prudemment près des cônes de chantier", "Une salle de concert, un conseil citoyen"]) {
    assert.equal(idee(`${texte}, voilà une proposition concrète.`).gravite, "ok");
  }
});

test("une insulte est bloquée, même déguisée", () => {
  for (const texte of ["Ce voisin est un connard", "quel C0NNARD", "un c o n n a r d", "des connnnards"]) {
    const verdict = idee(texte);
    assert.equal(verdict.gravite, "bloque", texte);
    assert.equal(verdict.motifs[0].code, "insulte");
  }
});

test("les tags sont analysés aussi", () => {
  assert.equal(idee("Une description tout à fait correcte.", "Un titre correct", ["salope"]).gravite, "bloque");
});

test("les coordonnées personnelles sont bloquées", () => {
  for (const texte of ["Appelez-moi au 06 12 34 56 78", "Tél : +33 1 99 00 12 34", "Écrivez à camille@exemple.fr"]) {
    assert.equal(idee(texte).motifs[0].code, "donnees_personnelles", texte);
  }
});

test("un horaire ou une année ne passe pas pour un téléphone", () => {
  assert.equal(idee("Ouvert de 10 h à 18 h depuis 2026, soit 12 000 passages par an.").gravite, "ok");
});

test("les cas douteux vont à un modérateur", () => {
  const cas: [string, string][] = [
    ["Cette rue est un vrai bordel depuis les travaux", "grossierete"],
    ["Madame Durand gare toujours sa voiture sur le trottoir", "personne_nommee"],
    ["Toutes les infos sur https://exemple.fr/offre", "lien"],
    ["Profitez de ce code promo pour le marché", "spam"],
    ["JE VEUX ABSOLUMENT PLUS DE PARKINGS DANS LA RUE", "majuscules"],
    ["vélo vélo vélo vélo vélo vélo vélo vélo vélo vélo", "repetition"],
  ];
  for (const [texte, code] of cas) {
    const verdict = idee(texte);
    assert.equal(verdict.gravite, "doute", texte);
    assert.ok(verdict.motifs.some((m) => m.code === code), texte);
  }
});

test("Monsieur le Maire n'est pas une personne nommée", () => {
  assert.equal(idee("Nous demandons à Monsieur le Maire un passage piéton.").gravite, "ok");
});

test("les pseudos injurieux sont refusés", () => {
  assert.equal(pseudoInacceptable("Connard21"), false, "un mot collé à des chiffres reste un autre mot");
  assert.equal(pseudoInacceptable("gros connard"), true);
  assert.equal(pseudoInacceptable("Camille"), false);
});

const existantes = [
  {
    id: 1,
    titre: "Une piste cyclable continue le long du lac Kir",
    description: "La piste s'interrompt et oblige à rejoindre la route, ce qui est dangereux pour les familles.",
  },
  { id: 2, titre: "Un jardin partagé aux Grésilles", description: "Des bacs à cultiver ensemble au pied des immeubles." },
];

test("une reformulation est reconnue comme doublon", () => {
  const doublon = trouverDoublon(
    { titre: "Piste cyclable continue le long du lac Kir", description: "Une demande pour plus de sécurité.", tags: [] },
    existantes,
  );
  assert.equal(doublon?.id, 1);
});

test("une idée différente n'est pas un doublon", () => {
  const doublon = trouverDoublon(
    { titre: "Un concert sur la place", description: "Inviter les musiciens amateurs une fois par mois.", tags: [] },
    existantes,
  );
  assert.equal(doublon, null);
});
