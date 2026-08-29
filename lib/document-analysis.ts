import type { Json, Tables } from "@/lib/supabase/database.types";
import type { DocumentAnalysis, DocumentAnalysisResult, ProductDocument } from "@/lib/types";

export const DOCUMENT_ANALYSIS_MODEL = "minimax/minimax-m3";
export const DOCUMENT_ANALYSIS_PROMPT_VERSION = "document-intelligence-v1";

export const analyzableMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function isAnalyzableMimeType(mimeType?: string) {
  return Boolean(mimeType && analyzableMimeTypes.has(mimeType));
}

export function mimeTypeFromFileName(fileName: string) {
  const extension = fileName.split(".").pop()?.toLocaleLowerCase("fr");
  if (extension === "pdf") return "application/pdf";
  if (["jpg", "jpeg"].includes(extension ?? "")) return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "doc") return "application/msword";
  if (extension === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (extension === "xls") return "application/vnd.ms-excel";
  if (extension === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return undefined;
}

export function safeAnalysisDate(value: string | null) {
  if (!value || !isoDatePattern.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : value;
}

export function estimateAnalysisCostUsd(inputTokens = 0, outputTokens = 0) {
  const inputCost = inputTokens * 0.0000003;
  const outputCost = outputTokens * 0.0000012;
  return Number((inputCost + outputCost).toFixed(6));
}

export function sanitizeAnalysisResult(
  result: DocumentAnalysisResult,
  allowedRequirementIds: Set<string>,
): DocumentAnalysisResult {
  const uniqueMatches = new Map<string, DocumentAnalysisResult["requirementMatches"][number]>();
  for (const match of result.requirementMatches) {
    if (allowedRequirementIds.has(match.productRequirementId) && !uniqueMatches.has(match.productRequirementId)) {
      uniqueMatches.set(match.productRequirementId, {
        ...match,
        confidence: Math.max(0, Math.min(100, Math.round(match.confidence))),
      });
    }
  }

  return {
    ...result,
    issueDate: safeAnalysisDate(result.issueDate),
    expiryDate: safeAnalysisDate(result.expiryDate),
    confidence: Math.max(0, Math.min(100, Math.round(result.confidence))),
    standards: [...new Set(result.standards.map((value) => value.trim()).filter(Boolean))].slice(0, 20),
    regulationReferences: [...new Set(result.regulationReferences.map((value) => value.trim()).filter(Boolean))].slice(0, 20),
    languageCodes: [...new Set(result.languageCodes.map((value) => value.trim().toUpperCase()).filter(Boolean))].slice(0, 20),
    warnings: result.warnings.map((value) => value.trim()).filter(Boolean).slice(0, 10),
    requirementMatches: [...uniqueMatches.values()].slice(0, 10),
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRequirementMatchArray(value: unknown): value is DocumentAnalysisResult["requirementMatches"] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    return typeof item.productRequirementId === "string"
      && typeof item.title === "string"
      && typeof item.reason === "string"
      && typeof item.confidence === "number";
  });
}

export function isDocumentAnalysisResult(value: Json | null): value is unknown & DocumentAnalysisResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return typeof value.documentType === "string"
    && (typeof value.suggestedTitle === "string" || value.suggestedTitle === null)
    && (typeof value.manufacturerName === "string" || value.manufacturerName === null)
    && (typeof value.productReference === "string" || value.productReference === null)
    && (typeof value.issuingBody === "string" || value.issuingBody === null)
    && (typeof value.issueDate === "string" || value.issueDate === null)
    && (typeof value.expiryDate === "string" || value.expiryDate === null)
    && isStringArray(value.standards)
    && isStringArray(value.regulationReferences)
    && isStringArray(value.languageCodes)
    && typeof value.confidence === "number"
    && ["strong", "partial", "weak"].includes(String(value.evidenceQuality))
    && typeof value.summary === "string"
    && isStringArray(value.warnings)
    && isRequirementMatchArray(value.requirementMatches);
}

export function mapStoredDocumentAnalysis(row: Tables<"document_analyses">): DocumentAnalysis {
  return {
    id: row.id,
    status: ["pending", "completed", "failed", "applied"].includes(row.status)
      ? row.status as DocumentAnalysis["status"]
      : "failed",
    model: row.model,
    result: isDocumentAnalysisResult(row.result) ? row.result : undefined,
    errorMessage: row.error_message ?? undefined,
    estimatedCostUsd: row.estimated_cost_usd ?? undefined,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
    appliedAt: row.applied_at ?? undefined,
  };
}

export function demoDocumentAnalysis(document: ProductDocument): DocumentAnalysis {
  const lowerName = document.name.toLocaleLowerCase("fr");
  const documentType = lowerName.includes("declaration") || lowerName.includes("déclaration")
    ? "Déclaration de conformité"
    : lowerName.includes("test") || lowerName.includes("rapport")
      ? "Rapport de laboratoire"
      : lowerName.includes("notice") || lowerName.includes("manuel")
        ? "Notice"
        : document.type;

  return {
    id: `demo-analysis-${document.id}`,
    status: "completed",
    model: "Démonstration locale",
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    result: {
      documentType,
      suggestedTitle: document.name,
      manufacturerName: "Nordhavn Design",
      productReference: "LUMA-MINI-01",
      issuingBody: documentType === "Rapport de laboratoire" ? "EU Testing Laboratory" : "Nordhavn Design",
      issueDate: "2026-06-12",
      expiryDate: documentType === "Rapport de laboratoire" ? "2028-06-12" : null,
      standards: ["EN 60598-1"],
      regulationReferences: ["Directive 2014/35/UE"],
      languageCodes: ["FR", "EN"],
      confidence: 91,
      evidenceQuality: "strong",
      summary: "Le document identifie le produit, son fabricant et les références techniques principales.",
      warnings: ["Vérifier que la référence produit correspond exactement au modèle commercialisé."],
      requirementMatches: [],
    },
  };
}
