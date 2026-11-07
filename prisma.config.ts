import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Pas de env() ici : `prisma generate` doit pouvoir tourner sans .env (postinstall).
    url: process.env.DATABASE_URL ?? "",
  },
});
