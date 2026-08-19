import type { Product, ProductDocument, Requirement } from "@/lib/types";

export const requirementStatusCopy: Record<Requirement["status"], string> = {
  verified: "Validée",
  pending: "En revue",
  missing: "Manquante",
  rejected: "Refusée",
  "not-applicable": "Non applicable",
};

export const documentStatusCopy: Record<ProductDocument["status"], string> = {
  verified: "Vérifié",
  review: "En analyse",
  rejected: "Refusé",
  expired: "Expiré",
};

export function buildRegulatoryReportSummary(product: Product) {
  const closedRequirements = product.requirements.filter((requirement) =>
    ["verified", "not-applicable"].includes(requirement.status),
  ).length;
  const verifiedDocuments = product.documents.filter((document) => document.status === "verified").length;

  return {
    totalRequirements: product.requirements.length,
    closedRequirements,
    openRequirements: product.requirements.length - closedRequirements,
    totalDocuments: product.documents.length,
    verifiedDocuments,
    attentionDocuments: product.documents.length - verifiedDocuments,
  };
}
