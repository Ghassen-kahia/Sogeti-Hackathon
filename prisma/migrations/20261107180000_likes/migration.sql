-- On ne vote plus contre une idée : seuls les « pour » sont conservés, comme des j'aime.
DELETE FROM "votes" WHERE "valeur" <> 1;
ALTER TABLE "votes" DROP COLUMN "valeur";

DROP INDEX "suggestions_score_idx";
ALTER TABLE "suggestions" DROP COLUMN "score", DROP COLUMN "votes_contre";
ALTER TABLE "suggestions" RENAME COLUMN "votes_pour" TO "likes";
CREATE INDEX "suggestions_likes_idx" ON "suggestions"("likes");
