import { describe, expect, it } from "vitest";
import { productsToCsv } from "@/lib/product-export";
import type { Product } from "@/lib/types";

const product: Product = {
  id: "p1",
  name: 'Panneau "BELLARO"',
  sku: "BEL-01",
  category: "Produit de construction",
  manufacturer: "Fabricant, Europe",
  originCountry: "France",
  destinationMarkets: ["France", "Belgique"],
  imageTone: "blue",
  status: "incomplete",
  score: 74,
  updatedAt: "19 août 2026",
  frameworks: ["CPR"],
  requirements: [],
  documents: [],
  audit: [],
};

describe("productsToCsv", () => {
  it("génère un CSV compatible avec Excel et protège les guillemets", () => {
    const csv = productsToCsv([product]);
    expect(csv).toContain("sep=;");
    expect(csv).toContain('"Panneau ""BELLARO"""');
    expect(csv).toContain('"France, Belgique"');
    expect(csv).toContain('"À compléter"');
    expect(csv).toContain('"74%"');
  });
});
