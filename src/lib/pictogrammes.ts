/** Tracés sur une grille de 24 × 24. La forme identifie la catégorie même sans percevoir sa couleur. */
const PICTOGRAMMES: Record<string, string[]> = {
  mobilite: [
    "M5.5 14a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z",
    "M18.5 14a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z",
    "M5.5 17.5 9 9.5h6.5l3 8",
    "M9 9.5l3.5 8h-7",
    "M15.5 9.5 14.5 6H17",
    "M7.5 6.5H11",
  ],
  "espaces-verts": ["M12 22v-6", "M12 2 6.5 9.5h2.8L5 16h14l-4.3-6.5h2.8z"],
  culture: [
    "M12 6.5C10 5 7 4.5 3 5v14c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5z",
    "M12 6.5v14",
  ],
  solidarite: [
    "M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
    "M2 20.5c0-3.5 2.7-6 6.5-6s6.5 2.5 6.5 6",
    "M16 4.3a3.5 3.5 0 0 1 0 6.4",
    "M18.5 14.8c2.2.8 3.5 2.9 3.5 5.7",
  ],
  proprete: ["M4 7h16", "M9 7V4h6v3", "M6 7l1 14h10l1-14", "M10 11v6", "M14 11v6"],
  commerces: ["M5.5 8.5h13L20 21.5H4z", "M8.5 11.5V7a3.5 3.5 0 0 1 7 0v4.5"],
  "sport-loisirs": [
    "M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19z",
    "M2.5 12h19",
    "M12 2.5v19",
    "M5.2 5.3c2.5 2 3.8 4.2 3.8 6.7s-1.3 4.7-3.8 6.7",
    "M18.8 5.3c-2.5 2-3.8 4.2-3.8 6.7s1.3 4.7 3.8 6.7",
  ],
};

const REPERE = ["M12 3a6 6 0 0 0-6 6c0 4.5 6 12 6 12s6-7.5 6-12a6 6 0 0 0-6-6z", "M12 7.5v3"];

export function tracesPictogramme(slug?: string) {
  return (slug && PICTOGRAMMES[slug]) || REPERE;
}

function echapper(texte: string) {
  return texte.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Épingle complète en HTML, pour Leaflet qui n'accepte pas de composant React. */
export function htmlEpingle(couleur: string, slug?: string, nom = "") {
  const sure = /^#[0-9a-f]{6}$/i.test(couleur) ? couleur : "#1f4d3a";
  const traces = tracesPictogramme(slug)
    .map((d) => `<path d="${d}"/>`)
    .join("");
  return `<div class="epingle">
    <svg viewBox="0 0 38 46" width="38" height="46" aria-hidden="true">
      <path d="M19 44.5C19 44.5 35.5 29 35.5 18.5a16.5 16.5 0 1 0-33 0C2.5 29 19 44.5 19 44.5z" fill="${sure}" stroke="#fff" stroke-width="2.5"/>
      <g transform="translate(8.5 8) scale(.875)" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${traces}</g>
    </svg>
    <span class="sr-only">${echapper(nom)}</span>
  </div>`;
}
