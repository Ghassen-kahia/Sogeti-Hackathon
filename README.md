# Place Commune

Plateforme collaborative d'évaluation des idées d'un quartier. Tout le monde peut consulter les idées ; il suffit d'un pseudo pour voter ou en proposer une.

Next.js 16, PostgreSQL, Prisma 7, Tailwind CSS 4, Leaflet avec OpenStreetMap.

## Installation

Il faut Node.js 22 et un serveur PostgreSQL.

1. Installez les dépendances :

   ```bash
   npm install
   ```

2. Copiez `.env.example` vers `.env`, puis renseignez `DATABASE_URL` et `SESSION_SECRET`.

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
| `npm run db:studio` | Ouvre Prisma Studio pour explorer la base |

## Base de données

| Table | Contenu |
| --- | --- |
| `users` | Pseudo uniquement, sans e-mail ni mot de passe |
| `suggestions` | Les idées, avec leur position facultative et leurs compteurs de votes |
| `categories` | Les catégories d'idées et leur couleur |
| `tags` | Les mots-clés, créés librement par les habitants |
| `localisations` | Les quartiers et leur position |
| `pieces_jointes` | Les métadonnées des documents joints |
| `votes` | Un vote par habitant et par idée |
| `_SuggestionToTag` | Le lien entre idées et tags |

Le schéma se trouve dans `prisma/schema.prisma`.

## Personnaliser

Les quartiers et les catégories sont définis en tête de `prisma/seed.ts`. Les quartiers fournis sont des exemples à Angers. Modifiez-les, puis lancez `npm run db:seed`.

## Bon à savoir

- **Pseudos :** ils ne sont pas protégés. Quiconque saisit un pseudo existant agit sous ce pseudo, et une même personne peut voter plusieurs fois avec plusieurs pseudos.
- **Documents joints :** ils sont stockés dans `uploads/`, et seules leurs métadonnées vont en base. Sauvegardez ce dossier avec la base. Sur un hébergeur sans disque persistant, il faut passer à un stockage objet.
- **Formats acceptés :** PDF, PNG, JPG, WebP et DOCX, 3 fichiers de 5 Mo au maximum par idée. Le type est vérifié d'après le contenu du fichier.
- **Carte :** les tuiles viennent des serveurs publics d'OpenStreetMap, ce qui convient à un prototype. Pour un trafic réel, utilisez un fournisseur de tuiles dédié.
