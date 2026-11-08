"use client";

import dynamic from "next/dynamic";

// Three.js est lourd et a besoin de `window` : il n'est chargé que sur cette page, dans le navigateur.
export const Visite3D = dynamic(() => import("@/components/visite-3d"), {
  ssr: false,
  loading: () => <div className="h-[60vh] min-h-96 animate-pulse rounded-2xl bg-trait/50" />,
});
