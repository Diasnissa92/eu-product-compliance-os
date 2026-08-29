import { describe, expect, it } from "vitest";
import {
  estimateAnalysisCostUsd,
  isAnalyzableMimeType,
  isDocumentAnalysisResult,
  parseDocumentAnalysisResponse,
  safeAnalysisDate,
  sanitizeAnalysisResult,
} from "../lib/document-analysis";
import type { DocumentAnalysisResult } from "../lib/types";

const baseResult: DocumentAnalysisResult = {
  documentType: "Rapport de laboratoire",
  suggestedTitle: "Rapport CEM",
  manufacturerName: "Example Industries",
  productReference: "REF-42",
  issuingBody: "Test Lab",
  issueDate: "2026-02-28",
  expiryDate: "2028-02-28",
  standards: [" EN 55015 ", "EN 55015"],
  regulationReferences: ["Directive 2014/30/UE"],
  languageCodes: ["fr", "EN"],
  confidence: 104,
  evidenceQuality: "strong",
  summary: "Rapport d’essai identifié.",
  warnings: [" Vérifier le modèle. "],
  requirementMatches: [
    { productRequirementId: "allowed", title: "Essais CEM", reason: "Le rapport cite la norme.", confidence: 95 },
    { productRequirementId: "invented", title: "Inconnue", reason: "Association non autorisée.", confidence: 80 },
    { productRequirementId: "allowed", title: "Doublon", reason: "Doublon.", confidence: 70 },
  ],
};

describe("document intelligence", () => {
  it("accepts only PDF and supported images", () => {
    expect(isAnalyzableMimeType("application/pdf")).toBe(true);
    expect(isAnalyzableMimeType("image/webp")).toBe(true);
    expect(isAnalyzableMimeType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(false);
  });

  it("rejects impossible ISO dates", () => {
    expect(safeAnalysisDate("2026-02-28")).toBe("2026-02-28");
    expect(safeAnalysisDate("2026-02-29")).toBeNull();
    expect(safeAnalysisDate("28/02/2026")).toBeNull();
  });

  it("keeps only known requirement matches and normalizes values", () => {
    const result = sanitizeAnalysisResult(baseResult, new Set(["allowed"]));
    expect(result.requirementMatches).toHaveLength(1);
    expect(result.requirementMatches[0].productRequirementId).toBe("allowed");
    expect(result.standards).toEqual(["EN 55015"]);
    expect(result.languageCodes).toEqual(["FR", "EN"]);
    expect(result.confidence).toBe(100);
    expect(result.warnings).toEqual(["Vérifier le modèle."]);
  });

  it("estimates the configured model cost", () => {
    expect(estimateAnalysisCostUsd(10_000, 2_000)).toBe(0.0054);
  });

  it("rejects a stored result with malformed requirement matches", () => {
    expect(isDocumentAnalysisResult({
      ...baseResult,
      requirementMatches: [{ productRequirementId: "allowed" }],
    })).toBe(false);
  });

  it("extracts a valid analysis wrapped in model commentary", () => {
    const response = `Voici le résultat :\n\`\`\`json\n${JSON.stringify(baseResult)}\n\`\`\``;
    expect(parseDocumentAnalysisResponse(response)).toEqual(baseResult);
  });

  it("rejects a model response without the required analysis shape", () => {
    expect(() => parseDocumentAnalysisResponse("Résultat : {\"summary\":\"incomplet\"}"))
      .toThrow("ne contient pas de résultat JSON exploitable");
  });
});
