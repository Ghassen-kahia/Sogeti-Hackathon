import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Atkinson_Hyperlegible, Fraunces, Instrument_Sans, Lexend } from "next/font/google";
import { Accessibilite } from "@/components/accessibilite";
import { MenuUtilisateur } from "@/components/menu-utilisateur";
import { SCRIPT_INITIAL } from "@/lib/accessibilite";
import "./globals.css";

const affiche = Fraunces({ variable: "--font-affiche", subsets: ["latin"] });
const texte = Instrument_Sans({ variable: "--font-texte", subsets: ["latin"] });
// Sans préchargement : ces polices ne se téléchargent que pour les personnes qui les choisissent.
const dyslexie = Lexend({ variable: "--font-dyslexie", subsets: ["latin"], preload: false });
const lisible = Atkinson_Hyperlegible({
  variable: "--font-lisible",
  subsets: ["latin"],
  weight: ["400", "700"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Quartia",
  description: "Proposez des idées pour votre quartier et évaluez celles de vos voisins.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${affiche.variable} ${texte.variable} ${dyslexie.variable} ${lisible.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_INITIAL }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <a href="#contenu" className="lien-evitement">
          Aller au contenu
        </a>
        <header className="sticky top-0 z-20 border-b border-trait bg-papier/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/" aria-label="Quartia, accueil">
              <Image src="/logo.png" alt="" width={679} height={284} loading="eager" className="h-14 w-auto" />
            </Link>
            <nav className="flex flex-wrap items-center gap-3">
              <Accessibilite />
              <Suspense fallback={<div className="h-10 w-24" />}>
                <MenuUtilisateur />
              </Suspense>
              <Link href="/idees/nouvelle" className="bouton-plein">
                Proposer<span className="hidden sm:inline"> une idée</span>
              </Link>
            </nav>
          </div>
        </header>

        <main id="contenu" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 outline-none sm:px-6">
          {children}
        </main>

        <footer className="border-t border-trait py-6 text-center text-sm text-gris">
          Quartia, les idées des habitants pour leur quartier.{" "}
          <Link href="/moderation" className="underline hover:text-encre">
            Espace modération
          </Link>
        </footer>
      </body>
    </html>
  );
}
