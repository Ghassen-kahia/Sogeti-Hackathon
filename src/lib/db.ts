import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function creerClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// Une seule instance en dev : le rechargement à chaud ouvrirait sinon un pool par module.
export const prisma = globalForPrisma.prisma ?? creerClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
