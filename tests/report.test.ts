import { describe, expect, it } from "vitest";
import { buildRegulatoryReportSummary, documentStatusCopy, requirementStatusCopy } from "@/lib/report";
import { createRegulatoryReportPdf, regulatoryReportPdfFilename } from "@/lib/report-pdf";
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

  it("creates a downloadable PDF with versioned qualification and action data", async () => {
    const pdf = createRegulatoryReportPdf({
      productName: "Panneau mural BELLARO",
      sku: "BEL-PM-001",
      category: "Produit de construction",
      manufacturer: "Fabricant OEM BELLARO — à confirmer",
      originCountry: "Chine",
      destinationMarkets: ["France"],
      frameworks: [],
      organizationName: "BATIDIAS",
      generatedAt: "1 septembre 2026 à 15:10",
      generatedBy: "Hugo Dias",
      updatedAt: "1 septembre 2026",
      score: 0,
      status: "Brouillon",
      closedRequirements: 0,
      totalRequirements: 0,
      verifiedDocuments: 2,
      totalDocuments: 2,
      nextDeadline: "Aucune",
      engineVersion: "eu-core-2026-09-01-v2",
      regulatoryAssessments: [
        {
          regulation: "EU 2024/3110",
          outcome: "Revue humaine requise",
          rationale: "La famille de produit et les spécifications techniques pertinentes doivent être confirmées.",
          sourceReference: "Articles 1 à 3",
        },
      ],
      regulatoryActions: [
        {
          title: "Valider le champ d’application — Règlement Produits de Construction",
          regulation: "EU 2024/3110",
          severity: "Élevé",
          status: "Ouverte",
          owner: "Non assigné",
          dueDate: "Non définie",
        },
      ],
      requirements: [],
      documents: [
        {
          name: "IMG_0101.jpg",
          type: "Image",
          status: "Vérifié",
          uploadedAt: "19 août 2026",
          expiresAt: "Non renseignée",
        },
      ],
    });
    const bytes = new Uint8Array(await pdf.arrayBuffer());
    const contents = String.fromCharCode(...bytes);

    expect(pdf.type).toBe("application/pdf");
    expect(contents.startsWith("%PDF-1.4")).toBe(true);
    expect(contents).toContain("/Type /Catalog");
    expect(contents).toContain("Panneau mural BELLARO");
    expect(contents).toContain("eu-core-2026-09-01-v2");
    expect(contents).toContain("EU 2024/3110");
    expect(contents.endsWith("%%EOF")).toBe(true);
    expect(regulatoryReportPdfFilename("Panneau mural BELLARO")).toBe("fiche-reglementaire-panneau-mural-bellaro.pdf");
  });
});
