import Link from "next/link";
import { seDeconnecter } from "@/app/actions";
import { compterFileModeration } from "@/lib/queries";
import { estModerateur, getUtilisateur } from "@/lib/session";

export async function MenuUtilisateur() {
  const [utilisateur, moderateur] = await Promise.all([getUtilisateur(), estModerateur()]);

  return (
    <>
      {moderateur && <LienModeration />}
      {utilisateur ? (
        <form action={seDeconnecter} className="flex items-center gap-3 text-sm">
          <span className="hidden max-w-40 truncate font-semibold sm:inline">{utilisateur.nickname}</span>
          <button type="submit" className="text-gris hover:text-encre hover:underline">
            Se déconnecter
          </button>
        </form>
      ) : (
        <Link href="/connexion" className="text-sm font-semibold text-foret hover:underline">
          Se connecter
        </Link>
      )}
    </>
  );
}

async function LienModeration() {
  const enAttente = await compterFileModeration();
  return (
    <Link href="/moderation" className="text-sm font-semibold text-foret hover:underline">
      Modération{enAttente > 0 && ` (${enAttente})`}
    </Link>
  );
}
