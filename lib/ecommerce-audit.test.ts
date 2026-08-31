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
  warningsApplicable: true,
  warnings: "Usage intérieur uniquement.",
  warningsNotApplicableReason: "",
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

  it("bloque une offre sans référence, image ni avertissements applicables", () => {
    const result = auditEcommerceListing({ ...complete, productIdentifier: "", warnings: "", traceabilityImage: false }, true);
    expect(result.status).toBe("blocking");
    expect(result.score).toBeLessThan(80);
  });

  it("exige le responsable UE pour un fabricant hors UE", () => {
    const result = auditEcommerceListing(complete, false);
    expect(result.findings.filter((item) => item.id.toString().startsWith("responsible") && item.status === "fail")).toHaveLength(3);
  });

  it("accepte l’absence d’avertissement uniquement avec une justification documentée", () => {
    const result = auditEcommerceListing({ ...complete, warningsApplicable: false, warnings: "", warningsNotApplicableReason: "Analyse de risques documentée : aucune information de sécurité spécifique." }, true);
    expect(result.findings.find((item) => item.id === "warnings")?.status).toBe("warning");
    expect(result.findings.find((item) => item.id === "warningsNotApplicableReason")?.status).toBe("pass");
    expect(result.status).toBe("compliant");
  });

  it("refuse une fausse adresse électronique", () => {
    const result = auditEcommerceListing({ ...complete, manufacturerElectronicAddress: "contact" }, true);
    expect(result.findings.find((item) => item.id === "manufacturerElectronicAddress")?.status).toBe("fail");
    expect(result.status).toBe("blocking");
  });
});
