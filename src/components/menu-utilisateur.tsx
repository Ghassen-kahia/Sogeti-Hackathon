import Link from "next/link";
import { seDeconnecter } from "@/app/actions";
import { getUtilisateur } from "@/lib/session";

export async function MenuUtilisateur() {
  const utilisateur = await getUtilisateur();

  if (!utilisateur) {
    return (
      <Link href="/connexion" className="text-sm font-semibold text-foret hover:underline">
        Se connecter
      </Link>
    );
  }

  return (
    <form action={seDeconnecter} className="flex items-center gap-3 text-sm">
      <span className="hidden max-w-40 truncate font-semibold sm:inline">{utilisateur.nickname}</span>
      <button type="submit" className="text-gris hover:text-encre hover:underline">
        Se déconnecter
      </button>
    </form>
  );
}
