import { deciderModeration } from "@/app/actions";

type Props = { id: number; statut: "PUBLIEE" | "EN_ATTENTE" | "REJETEE" };

/** Sans JavaScript côté client : deux formulaires qui appellent la même action serveur. */
export function ActionsModeration({ id, statut }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {statut !== "PUBLIEE" && (
        <form action={deciderModeration}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="decision" value="PUBLIEE" />
          <button type="submit" className="bouton-plein">
            Publier
          </button>
        </form>
      )}

      {statut !== "REJETEE" && (
        <form action={deciderModeration} className="flex min-w-64 flex-1 flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="decision" value="REJETEE" />
          <div className="min-w-48 flex-1">
            <label htmlFor={`note-${id}`} className="libelle">
              Message à l&apos;auteur <span className="font-normal text-gris">(facultatif)</span>
            </label>
            <input id={`note-${id}`} name="note" maxLength={500} className="champ" />
          </div>
          <button type="submit" className="bouton-contour">
            Rejeter
          </button>
        </form>
      )}
    </div>
  );
}
