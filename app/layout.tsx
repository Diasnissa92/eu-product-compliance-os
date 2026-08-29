import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "EU Product Compliance OS",
  title: {
    default: "EU Product Compliance OS",
    template: "%s · EU Product Compliance OS",
  },
  description:
    "Pilotez les preuves, les risques et la préparation réglementaire de vos produits pour le marché européen.",
  robots: { index: false, follow: false, nocache: true },
  formatDetection: { email: false, address: false, telephone: false },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#082a35",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
