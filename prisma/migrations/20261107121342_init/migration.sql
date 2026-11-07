-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "nickname" VARCHAR(24) NOT NULL,
    "nickname_key" VARCHAR(24) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(60) NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "couleur" VARCHAR(7) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(30) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "localisations" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(80) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "ville" VARCHAR(80) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "localisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suggestions" (
    "id" SERIAL NOT NULL,
    "titre" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "votes_pour" INTEGER NOT NULL DEFAULT 0,
    "votes_contre" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auteur_id" INTEGER NOT NULL,
    "categorie_id" INTEGER NOT NULL,
    "localisation_id" INTEGER NOT NULL,

    CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pieces_jointes" (
    "id" SERIAL NOT NULL,
    "nom_original" VARCHAR(255) NOT NULL,
    "nom_stockage" VARCHAR(64) NOT NULL,
    "type_mime" VARCHAR(120) NOT NULL,
    "taille" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suggestion_id" INTEGER NOT NULL,

    CONSTRAINT "pieces_jointes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "user_id" INTEGER NOT NULL,
    "suggestion_id" INTEGER NOT NULL,
    "valeur" SMALLINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("user_id","suggestion_id")
);

-- CreateTable
CREATE TABLE "_SuggestionToTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_SuggestionToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_nickname_key_key" ON "users"("nickname_key");

-- CreateIndex
CREATE UNIQUE INDEX "categories_nom_key" ON "categories"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tags_nom_key" ON "tags"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "localisations_nom_key" ON "localisations"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "localisations_slug_key" ON "localisations"("slug");

-- CreateIndex
CREATE INDEX "suggestions_created_at_idx" ON "suggestions"("created_at");

-- CreateIndex
CREATE INDEX "suggestions_score_idx" ON "suggestions"("score");

-- CreateIndex
CREATE INDEX "suggestions_categorie_id_idx" ON "suggestions"("categorie_id");

-- CreateIndex
CREATE INDEX "suggestions_localisation_id_idx" ON "suggestions"("localisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "pieces_jointes_nom_stockage_key" ON "pieces_jointes"("nom_stockage");

-- CreateIndex
CREATE INDEX "pieces_jointes_suggestion_id_idx" ON "pieces_jointes"("suggestion_id");

-- CreateIndex
CREATE INDEX "votes_suggestion_id_idx" ON "votes"("suggestion_id");

-- CreateIndex
CREATE INDEX "_SuggestionToTag_B_index" ON "_SuggestionToTag"("B");

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_localisation_id_fkey" FOREIGN KEY ("localisation_id") REFERENCES "localisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieces_jointes" ADD CONSTRAINT "pieces_jointes_suggestion_id_fkey" FOREIGN KEY ("suggestion_id") REFERENCES "suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_suggestion_id_fkey" FOREIGN KEY ("suggestion_id") REFERENCES "suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SuggestionToTag" ADD CONSTRAINT "_SuggestionToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SuggestionToTag" ADD CONSTRAINT "_SuggestionToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
