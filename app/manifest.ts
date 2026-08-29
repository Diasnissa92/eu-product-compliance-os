import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EU Product Compliance OS",
    short_name: "EU Compliance",
    description: "Pilotage des preuves et de la préparation réglementaire des produits pour le marché européen.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f2f7f5",
    theme_color: "#082a35",
    lang: "fr",
    categories: ["business", "productivity"],
  };
}
