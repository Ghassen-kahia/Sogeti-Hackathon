-- CreateEnum
CREATE TYPE "statut_moderation" AS ENUM ('PUBLIEE', 'EN_ATTENTE', 'REJETEE');

-- AlterTable
ALTER TABLE "suggestions" ADD COLUMN     "analysee_par" VARCHAR(20),
ADD COLUMN     "moderated_at" TIMESTAMP(3),
ADD COLUMN     "motifs_moderation" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "note_moderation" VARCHAR(500),
ADD COLUMN     "statut" "statut_moderation" NOT NULL DEFAULT 'PUBLIEE';

-- CreateTable
CREATE TABLE "signalements" (
    "user_id" INTEGER NOT NULL,
    "suggestion_id" INTEGER NOT NULL,
    "motif" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signalements_pkey" PRIMARY KEY ("user_id","suggestion_id")
);

-- CreateIndex
CREATE INDEX "signalements_suggestion_id_idx" ON "signalements"("suggestion_id");

-- CreateIndex
CREATE INDEX "suggestions_statut_created_at_idx" ON "suggestions"("statut", "created_at");

-- AddForeignKey
ALTER TABLE "signalements" ADD CONSTRAINT "signalements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signalements" ADD CONSTRAINT "signalements_suggestion_id_fkey" FOREIGN KEY ("suggestion_id") REFERENCES "suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
