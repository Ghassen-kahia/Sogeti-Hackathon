import assert from "node:assert/strict";
import { test } from "node:test";
import { lirePreferences, REGLAGES_STANDARD, reglagesDesProfils } from "./accessibilite";

test("sans profil, l'affichage reste standard", () => {
  assert.deepEqual(reglagesDesProfils([]), REGLAGES_STANDARD);
});

test("un profil active ses aides", () => {
  const reglages = reglagesDesProfils(["moteur"]);
  assert.equal(reglages.cibles, true);
  assert.equal(reglages.animations, true);
  assert.equal(reglages.contraste, false);
});

test("plusieurs profils se cumulent, quel que soit l'ordre", () => {
  for (const ids of [["dyslexie", "malvoyance"], ["malvoyance", "dyslexie"]] as const) {
    const reglages = reglagesDesProfils([...ids]);
    assert.equal(reglages.taille, "tres-grand");
    assert.equal(reglages.police, "dyslexie");
    assert.equal(reglages.contraste, true);
    assert.equal(reglages.lecture, true);
  }
});

test("une sauvegarde abîmée repose la question", () => {
  for (const brut of [null, "", "pas du json", "{}", '{"profils":"x","reglages":{}}']) {
    assert.equal(lirePreferences(brut), null, String(brut));
  }
});

test("une sauvegarde ancienne reçoit les réglages ajoutés depuis", () => {
  const preferences = lirePreferences('{"profils":["moteur"],"reglages":{"cibles":true}}');
  assert.equal(preferences?.reglages.cibles, true);
  assert.equal(preferences?.reglages.taille, "normal");
});
