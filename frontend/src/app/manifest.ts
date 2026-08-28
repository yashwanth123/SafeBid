import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SafeBid",
    short_name: "SafeBid",
    description: "Neighborhood feed and verified services with escrow.",
    start_url: "/feed",
    scope: "/",
    display: "standalone",
    background_color: "#F6F1E7",
    theme_color: "#1B4332",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
