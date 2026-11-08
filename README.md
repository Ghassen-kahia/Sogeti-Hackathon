# Quartia

Plateforme collaborative d'évaluation des idées d'un quartier. Tout le monde peut consulter les idées ; il suffit d'un pseudo pour aimer une idée ou en proposer une.

Next.js 16, PostgreSQL, Prisma 7, Tailwind CSS 4, Leaflet avec OpenStreetMap.

## Installation

Il faut Node.js 22 et un serveur PostgreSQL.

1. Installez les dépendances :

   ```bash
   npm install
   ```

2. Copiez `.env.example` vers `.env`, puis renseignez `DATABASE_URL`, `SESSION_SECRET` et `MODERATION_CODE`.

3. Créez la base, ses tables et les données de démonstration :

   ```bash
   npm run db:setup
   ```

4. Lancez l'application sur http://localhost:3000 :

   ```bash
   npm run dev
   ```

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` puis `npm start` | Version de production |
| `npm run db:setup` | Applique les migrations et charge les données de démonstration |
| `npm run db:seed` | Recharge les catégories et les quartiers |
| `npm run db:demo` | **Efface toute la base** et recharge le jeu de données de démonstration |
| `npm test` | Lance les tests des règles de modération |
| `npm run db:studio` | Ouvre Prisma Studio pour explorer la base |

## Base de données

| Table | Contenu |
| --- | --- |
| `users` | Pseudo uniquement, sans e-mail ni mot de passe |
| `suggestions` | Les idées, avec leur position facultative et leur compteur de j'aime |
| `categories` | Les catégories d'idées et leur couleur |
| `tags` | Les mots-clés, créés librement par les habitants |
| `localisations` | Les quartiers et leur position |
| `pieces_jointes` | Les métadonnées des documents joints |
| `votes` | Un j'aime par habitant et par idée |
| `signalements` | Un signalement par habitant et par idée |
| `_SuggestionToTag` | Le lien entre idées et tags |

Le schéma se trouve dans `prisma/schema.prisma`.

## Personnaliser

Le jeu de données de démonstration est dans `prisma/donnees/idees-dijon.json`. Les 20 quartiers de Dijon et les 22 communes de la métropole, avec leurs coordonnées, viennent de `villes_quartiers_dijon.xlsx`. Les voisins et les idées sont fictifs. Remplacez ce fichier pour changer de territoire, puis lancez `npm run db:demo`. Les catégories sont en tête de `prisma/seed.ts`, et les exemples affichés dans le formulaire dans `src/lib/exemples-idees.ts`.

## Accessibilité

À la première visite, chacun indique s'il a besoin d'une adaptation : dyslexie, mauvaise vue, daltonisme, handicap moteur ou difficultés de concentration, plusieurs choix étant possibles. Le bouton Accessibilité, en haut de chaque page, permet de revenir sur ce choix ou de régler chaque option.

Les profils et leurs réglages sont définis dans `src/lib/accessibilite.ts`, et leur effet dans `src/app/globals.css`. Ils restent dans le navigateur (`localStorage`) : un handicap est une donnée de santé, le serveur n'en a jamais connaissance. Le choix est donc à refaire sur chaque appareil.

## Carte

La page d'accueil affiche les idées en fiches ou sur une grande carte (`/?vue=carte`). Les filtres sont conservés d'une vue à l'autre.

Chaque épingle porte le pictogramme de sa catégorie, repris sur les cartes d'idées, et la forme suffit à l'identifier sans percevoir les couleurs. Les épingles proches sont regroupées, et la légende sous la carte affiche ou masque une catégorie.

## Visite 3D

Chaque idée a une page `/idees/[id]/visite`, qui compare le lieu aujourd'hui et avec l'idée, en vue d'ensemble ou à pied.

- **Terrain :** la photo aérienne et les bâtiments, avec leur hauteur réelle, viennent de la Géoplateforme de l'IGN, sans clé d'API. Le sol est représenté à plat.
- **Simulation :** `src/lib/visite/scenarios.ts` choisit un aménagement d'après les mots du titre, puis de la description, puis la catégorie. C'est une illustration, pas un projet.
- **Placement :** l'aménagement se pose sur l'espace libre le plus proche de la position, en évitant les bâtiments. Les routes et les parkings ne sont pas détectés.
- **Sans réseau :** la page s'ouvre sans photo ni bâtiments, et les bâtiments sont réessayés au prochain chargement.

## Modération

Chaque idée est analysée à sa soumission, dans cet ordre :

1. **Règles locales** (`src/lib/moderation/regles.ts`). Insultes, propos haineux, menaces et coordonnées personnelles bloquent la publication : l'auteur voit pourquoi et peut corriger, rien n'est enregistré. Grossièretés, personne nommée, lien, publicité, majuscules et répétitions envoient l'idée à un modérateur.
2. **Doublons.** Une idée très proche d'une idée publiée part aussi en relecture.
3. **Claude, si `ANTHROPIC_API_KEY` est défini** (`src/lib/moderation/ia.ts`). Il repère ce que des règles ne voient pas, comme le hors-sujet ou le harcèlement déguisé. Il ne refuse jamais seul : au pire, il confie l'idée à un humain. Sans clé, ou en cas de panne, les règles locales suffisent et la publication continue. Le texte d'une idée, sans le pseudo de son auteur, est alors envoyé à l'API d'Anthropic.

Une idée en attente ou rejetée n'est visible que de son auteur et des modérateurs, documents joints compris. Après `SEUIL_SIGNALEMENTS` signalements d'habitants (3 par défaut), une idée publiée repart en relecture.

Les modérateurs travaillent sur `/moderation`, avec le code `MODERATION_CODE`. Sans ce code dans `.env`, l'espace reste fermé.

## Bon à savoir

- **Pseudos :** ils ne sont pas protégés. Quiconque saisit un pseudo existant agit sous ce pseudo, et une même personne peut aimer ou signaler plusieurs fois avec plusieurs pseudos.
- **Limites de la modération :** seuls le titre, la description et les tags sont analysés, pas le contenu des documents joints. Les listes de mots ne remplacent pas une relecture humaine, et le code de modération est partagé entre les agents, sans compte individuel.
- **Documents joints :** ils sont stockés dans `uploads/`, et seules leurs métadonnées vont en base. Sauvegardez ce dossier avec la base. Sur un hébergeur sans disque persistant, il faut passer à un stockage objet.
- **Formats acceptés :** PDF, PNG, JPG, WebP et DOCX, 3 fichiers de 5 Mo au maximum par idée. Le type est vérifié d'après le contenu du fichier.
- **Carte :** les tuiles viennent des serveurs publics d'OpenStreetMap, ce qui convient à un prototype. Pour un trafic réel, utilisez un fournisseur de tuiles dédié.
