"use client";

import { useEffect, useState } from "react";

/** Visible seulement si la lecture à voix haute est activée dans les réglages d'accessibilité. */
export function LectureVoix({ texte }: { texte: string }) {
  const [enCours, setEnCours] = useState(false);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function basculer() {
    const synthese = window.speechSynthesis;
    if (!synthese) return;

    synthese.cancel();
    if (enCours) return setEnCours(false);

    const lecture = new SpeechSynthesisUtterance(texte);
    lecture.lang = "fr-FR";
    lecture.onend = () => setEnCours(false);
    lecture.onerror = () => setEnCours(false);
    setEnCours(true);
    synthese.speak(lecture);
  }

  return (
    <button type="button" onClick={basculer} aria-pressed={enCours} className="bouton-contour bouton-lecture mt-4">
      {enCours ? "Arrêter la lecture" : "Écouter cette idée"}
    </button>
  );
}
