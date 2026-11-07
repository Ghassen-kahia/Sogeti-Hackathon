"use client";

export default function Erreur({ retry }: { error: Error; retry: () => void }) {
  return (
    <div className="py-24 text-center">
      <h1 className="font-titre text-3xl font-semibold text-foret">Un problème est survenu</h1>
      <p className="mt-2 text-gris">Les idées n&apos;ont pas pu être chargées. Réessayez dans un instant.</p>
      <button type="button" onClick={() => retry()} className="bouton-plein mt-6">
        Réessayer
      </button>
    </div>
  );
}
