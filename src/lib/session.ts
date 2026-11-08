import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";

const COOKIE = "pc_session";
const DUREE_SECONDES = 60 * 60 * 24 * 30;
const COOKIE_MODERATION = "pc_moderation";
const DUREE_MODERATION_SECONDES = 60 * 60 * 8;
// L'audience distingue ce jeton de celui d'un habitant, signé avec la même clé.
const AUDIENCE_MODERATION = "moderation";
const LONGUEUR_MIN_CODE = 12;

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

const empreinte = (texte: string) => createHash("sha256").update(texte).digest();

/** Les pseudos n'étant pas protégés, l'accès modérateur repose sur un code connu de la seule collectivité. */
export function codeModerationValide(saisie: string) {
  const code = process.env.MODERATION_CODE;
  if (!code || code.length < LONGUEUR_MIN_CODE) return false;
  return timingSafeEqual(empreinte(saisie), empreinte(code));
}

export async function ouvrirSessionModeration() {
  const jeton = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(AUDIENCE_MODERATION)
    .setIssuedAt()
    .setExpirationTime(`${DUREE_MODERATION_SECONDES}s`)
    .sign(cle());

  (await cookies()).set(COOKIE_MODERATION, jeton, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DUREE_MODERATION_SECONDES,
  });
}

export async function fermerSessionModeration() {
  (await cookies()).delete(COOKIE_MODERATION);
}

export const estModerateur = cache(async () => {
  const jeton = (await cookies()).get(COOKIE_MODERATION)?.value;
  if (!jeton) return false;
  try {
    await jwtVerify(jeton, cle(), { algorithms: ["HS256"], audience: AUDIENCE_MODERATION });
    return true;
  } catch {
    return false;
  }
});

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
