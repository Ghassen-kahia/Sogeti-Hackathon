import Link from "next/link";

export default function Introuvable() {
  return (
    <div className="py-24 text-center">
      <h1 className="font-titre text-3xl font-semibold text-foret">Cette page n&apos;existe pas</h1>
      <p className="mt-2 text-gris">L&apos;idée a peut-être été retirée, ou le lien est incorrect.</p>
      <Link href="/" className="bouton-plein mt-6">
        Retour aux idées
      </Link>
    </div>
  );
}
