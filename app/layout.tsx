import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "EU Product Compliance OS",
    template: "%s · EU Product Compliance OS",
  },
  description:
    "Pilotez les preuves, les risques et la préparation réglementaire de vos produits pour le marché européen.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
