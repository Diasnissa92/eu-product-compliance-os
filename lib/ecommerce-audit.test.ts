import { describe, expect, it } from "vitest";
import { auditEcommerceListing, type EcommerceListingInput } from "@/lib/ecommerce-audit";

const complete: EcommerceListingInput = {
  title: "Lampe Luma Mini",
  productIdentifier: "LUM-204-FR",
  manufacturerName: "Nordhavn Design ApS",
  manufacturerPostalAddress: "1 Designgade, 2100 Copenhague",
  manufacturerElectronicAddress: "compliance@example.eu",
  responsiblePersonName: "",
  responsiblePersonPostalAddress: "",
  responsiblePersonElectronicAddress: "",
  warnings: "Usage intérieur uniquement.",
  language: "Français",
  traceabilityImage: true,
};

describe("auditEcommerceListing", () => {
  it("valide une offre complète d’un fabricant UE", () => {
    const result = auditEcommerceListing(complete, true);
    expect(result.status).toBe("compliant");
    expect(result.score).toBe(100);
    expect(result.findings.filter((item) => item.status === "fail")).toHaveLength(0);
  });

  it("bloque une offre sans référence et sans avertissements", () => {
    const result = auditEcommerceListing({ ...complete, productIdentifier: "", warnings: "" }, true);
    expect(result.status).toBe("blocking");
    expect(result.score).toBeLessThan(80);
  });

  it("exige le responsable UE pour un fabricant hors UE", () => {
    const result = auditEcommerceListing(complete, false);
    expect(result.findings.filter((item) => item.id.toString().startsWith("responsible") && item.status === "fail")).toHaveLength(3);
  });
});

