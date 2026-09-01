import { describe, expect, it } from "vitest";
import { parseProductCsv } from "@/lib/product-import";

describe("parseProductCsv", () => {
  it("importe un CSV français séparé par des points-virgules avec secteur explicite", () => {
    const result = parseProductCsv("nom;sku;catégorie;secteur;fabricant;pays_origine;marchés\nPanneau;P-1;Produit de construction;construction;ACME;France;France|Belgique");
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0]).toMatchObject({ name: "Panneau", sku: "P-1", sector: "construction", targetMarkets: ["France", "Belgique"] });
  });

  it("accepte les cellules citées", () => {
    const result = parseProductCsv('name,sku,sector,manufacturer\n"Panneau, Mini",P-2,construction,"ACME, SAS"');
    expect(result.rows[0].name).toBe("Panneau, Mini");
    expect(result.rows[0].manufacturer).toBe("ACME, SAS");
  });

  it("accepte une cellule citée sur plusieurs lignes", () => {
    const result = parseProductCsv('name,sku,sector,manufacturer\n"Panneau\nMini",P-3,construction,ACME');
    expect(result.rows[0].name).toBe("Panneau\nMini");
  });

  it("écarte les SKU dupliqués dans le même fichier", () => {
    const result = parseProductCsv("nom;sku;secteur\nPanneau;ABC-1;construction\nPanneau bis;abc-1;construction");
    expect(result.rows).toHaveLength(1);
    expect(result.errors[0].message).toContain("dupliqué");
  });

  it("refuse un fichier sans SKU", () => {
    const result = parseProductCsv("nom;catégorie;secteur\nPanneau;Construction;construction");
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].message).toContain("SKU");
  });

  it("refuse un fichier sans secteur pour éviter une qualification réglementaire implicite", () => {
    const result = parseProductCsv("nom;sku\nLampe;L-1");
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].message).toContain("secteur");
  });

  it("refuse un secteur non reconnu au lieu de deviner", () => {
    const result = parseProductCsv("nom;sku;secteur\nLampe;L-1;électrique");
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].message).toContain("Secteur invalide");
  });

  it("refuse deux colonnes qui ciblent le même champ", () => {
    const result = parseProductCsv("nom;name;sku;secteur\nPanneau;Panneau;P-1;construction");
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].message).toContain("plusieurs fois");
  });
});
