import { describe, expect, it } from "vitest";
import { parseProductCsv } from "@/lib/product-import";

describe("parseProductCsv", () => {
  it("importe un CSV français séparé par des points-virgules", () => {
    const result = parseProductCsv("nom;sku;catégorie;fabricant;pays_origine;marchés\nLampe;L-1;Éclairage;ACME;France;France|Belgique");
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0]).toMatchObject({ name: "Lampe", sku: "L-1", targetMarkets: ["France", "Belgique"] });
  });

  it("accepte les cellules citées", () => {
    const result = parseProductCsv('name,sku,manufacturer\n"Lampe, Mini",L-2,"ACME, SAS"');
    expect(result.rows[0].name).toBe("Lampe, Mini");
    expect(result.rows[0].manufacturer).toBe("ACME, SAS");
  });

  it("accepte une cellule citée sur plusieurs lignes", () => {
    const result = parseProductCsv('name,sku,manufacturer\n"Lampe\nMini",L-3,ACME');
    expect(result.rows[0].name).toBe("Lampe\nMini");
  });

  it("écarte les SKU dupliqués dans le même fichier", () => {
    const result = parseProductCsv("nom;sku\nLampe;ABC-1\nLampe bis;abc-1");
    expect(result.rows).toHaveLength(1);
    expect(result.errors[0].message).toContain("dupliqué");
  });

  it("refuse un fichier sans SKU", () => {
    const result = parseProductCsv("nom;catégorie\nLampe;Éclairage");
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].message).toContain("SKU");
  });
});
