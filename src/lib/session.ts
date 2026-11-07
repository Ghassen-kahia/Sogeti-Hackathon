import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";

const COOKIE = "pc_session";
const DUREE_SECONDES = 60 * 60 * 24 * 30;

function cle() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET doit être défini dans .env (32 caractères minimum).");
  }
  return new TextEncoder().encode(secret);
}

export async function ouvrirSession(userId: number) {
  const jeton = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${DUREE_SECONDES}s`)
    .sign(cle());

  (await cookies()).set(COOKIE, jeton, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DUREE_SECONDES,
  });
}

export async function fermerSession() {
  (await cookies()).delete(COOKIE);
}

/** Utilisateur connecté, ou null. Mémorisé le temps de la requête. */
export const getUtilisateur = cache(async () => {
  const jeton = (await cookies()).get(COOKIE)?.value;
  if (!jeton) return null;

  let userId: number;
  try {
    const { payload } = await jwtVerify(jeton, cle(), { algorithms: ["HS256"] });
    userId = Number(payload.sub);
  } catch {
    return null;
  }
  if (!Number.isInteger(userId)) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, nickname: true },
  });
});
