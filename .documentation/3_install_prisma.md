# Prisma dans un projet Next.js

## Objectif

Prisma est un ORM TypeScript permettant de :

- Modéliser la base de données via un schéma déclaratif.
- Générer automatiquement un client TypeScript typé.
- Gérer les migrations de schéma.
- Alimenter la base via des scripts de seeding.

Architecture :

```text
Next.js
   │
   ▼
Prisma Client
   │
   ▼
PostgreSQL
```

---

# Installation

Installer les dépendances :

```bash
npm install @prisma/client
npm install --save-dev prisma@7.10.1
```

Si vous utilisez Postgresql : 
```bash
npm install @prisma/adapter-pg
```

Initialiser Prisma :

```bash
npx prisma init
```

Fichiers créés :

```text
.env
prisma/
└── schema.prisma
```

---

# Configuration de la connexion PostgreSQL

Dans `.env` :

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ma_base"
```

Exemple :

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nextjs-dashboard-postgres"
```

---

# Fichier schema.prisma

Exemple minimal :

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model User {
  id       String @id @default(uuid())
  name     String
  email    String @unique
  password String
}
```

---

# Création de la base

Prisma ne crée pas la base PostgreSQL elle-même.

Créer la base depuis PostgreSQL :

```sql
CREATE DATABASE nextjs_dashboard;
```

ou :

```bash
createdb nextjs_dashboard
```

---

# Création du schéma dans la base

## Méthode rapide (sans migration)

Créer ou mettre à jour les tables :

```bash
npx prisma db push
```

Cette commande :

- Crée les tables manquantes.
- Met à jour le schéma.
- Ne crée pas d'historique de migration.

> **À privilégier pour un prototype ou un projet personnel.**

---

## Méthode recommandée (avec migrations)

Créer une migration :

```bash
npx prisma migrate dev --name init
```

Exemple :

```bash
npx prisma migrate dev --name create_user_table
```

Prisma :

- Génère un script SQL.
- L'exécute sur PostgreSQL.
- Conserve l'historique dans `prisma/migrations`.

Structure obtenue :

```text
prisma/
├── migrations/
│   └── 20261029103000_init/
│       └── migration.sql
└── schema.prisma
```

---

# Génération du Prisma Client

Après chaque modification du schéma :

```bash
npx prisma generate
```

Cette commande génère les classes TypeScript utilisées dans l'application.

---

# Utilisation dans Next.js

Créer :

```text
prisma/lib/dbcontext.ts
```

Pour un client Prisma adapté à PostgreSQL :
```typescript
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/client';

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
```

Exemple d'utilisation :

```typescript
import { prisma } from '@/prisma/lib/dbcontext';

const users = await prisma.user.findMany();
```

---

# Mise en place du Seed

Créer :

```text
prisma/seed.ts
```

Exemple :

```typescript
import { prisma } from "@/prisma/lib/dbcontext";
import bcrypt from "bcrypt";
import { users } from '@/app/lib/placeholder-data';

async function main() {
    await Promise.all(
        users.map(async (user) => {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            await prisma.user.create({
                data: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    password: hashedPassword,
                },
            });
        })
    );

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
```

Installer l'exécuteur TypeScript :

```bash
npm install -D tsx
```

Déclarer le seed dans `package.json` :

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

---

# Exécution du Seed

Lancer :

```bash
npx prisma db seed
```

Exécution directe :

```bash
npx tsx prisma/seed.ts
```

---

# Commandes Prisma principales

## Initialisation

```bash
npx prisma init
```

## Génération du client

```bash
npx prisma generate
```

## Mise à jour rapide du schéma

```bash
npx prisma db push
```

## Création d'une migration

```bash
npx prisma migrate dev --name nom_migration
```

## Application des migrations en production

```bash
npx prisma migrate deploy
```

## Réinitialisation complète de la base

```bash
npx prisma migrate reset
```

## Exécution du seed

```bash
npx prisma db seed
```

## Introspection d'une base existante

```bash
npx prisma db pull
```

Prisma génère automatiquement les modèles à partir du schéma PostgreSQL existant.

## Interface graphique

```bash
npx prisma studio
```

Permet de consulter et modifier les données directement depuis un navigateur.

---

# Workflow recommandé

## Nouveau projet

```bash
npx prisma init
```

Configurer :

```env
DATABASE_URL
```

Créer les modèles dans :

```text
prisma/schema.prisma
```

Générer la migration :

```bash
npx prisma migrate dev --name init
```

Créer :

```text
prisma/seed.ts
```

Exécuter :

```bash
npx prisma db seed
```

Générer le client :

```bash
npx prisma generate
```

Intégrer Prisma dans Next.js via :

```text
src/lib/prisma.ts
```

Le projet est alors prêt pour les opérations CRUD.