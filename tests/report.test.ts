import { describe, expect, it } from "vitest";
import { buildRegulatoryReportSummary, documentStatusCopy, requirementStatusCopy } from "@/lib/report";
import type { Product } from "@/lib/types";

const product: Product = {
  id: "product-1",
  name: "Produit test",
  sku: "TEST-001",
  category: "Équipement électrique",
  manufacturer: "Fabricant test",
  originCountry: "France",
  destinationMarkets: ["France"],
  imageTone: "sage",
  status: "incomplete",
  score: 54,
  updatedAt: "Aujourd’hui",
  frameworks: ["GPSR"],
  requirements: [
    { id: "1", title: "Validée", description: "", regulation: "GPSR", status: "verified", severity: "high" },
    { id: "2", title: "Non applicable", description: "", regulation: "GPSR", status: "not-applicable", severity: "low" },
    { id: "3", title: "À traiter", description: "", regulation: "GPSR", status: "pending", severity: "blocking" },
  ],
  documents: [
    { id: "1", name: "preuve.pdf", type: "PDF", status: "verified", uploadedAt: "Aujourd’hui", size: "1 Mo" },
    { id: "2", name: "brouillon.pdf", type: "PDF", status: "review", uploadedAt: "Aujourd’hui", size: "1 Mo" },
  ],
  audit: [],
};

describe("regulatory report", () => {
  it("summarizes closed requirements and verified documents", () => {
    expect(buildRegulatoryReportSummary(product)).toEqual({
      totalRequirements: 3,
      closedRequirements: 2,
      openRequirements: 1,
      totalDocuments: 2,
      verifiedDocuments: 1,
      attentionDocuments: 1,
    });
  });

  it("provides readable French status labels", () => {
    expect(requirementStatusCopy["not-applicable"]).toBe("Non applicable");
    expect(documentStatusCopy.expired).toBe("Expiré");
  });
});
