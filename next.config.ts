import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      // 3 fichiers de 5 Mo maximum, plus le reste du formulaire.
      bodySizeLimit: "16mb",
    },
  },
  turbopack: {
    // Un autre lockfile existe dans un dossier parent : on fixe la racine sur ce projet.
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
