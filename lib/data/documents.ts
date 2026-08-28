import "server-only";

import type { WorkspaceContext } from "@/lib/auth/workspace";
import { products as demoProducts } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { mapStoredDocumentAnalysis, mimeTypeFromFileName } from "@/lib/document-analysis";
import type { PortfolioDocument, ProductDocument } from "@/lib/types";
import { cache } from "react";

type DocumentRow = Tables<"documents">;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function documentSize(metadata: DocumentRow["metadata"]) {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata) && typeof metadata.size === "number") {
    return metadata.size > 1_000_000
      ? `${(metadata.size / 1_000_000).toFixed(1)} Mo`
      : `${Math.max(1, Math.ceil(metadata.size / 1000))} Ko`;
  }
  return "Fichier sécurisé";
}

function documentMimeType(metadata: DocumentRow["metadata"], fileName: string) {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata) && typeof metadata.mime_type === "string") {
    return metadata.mime_type;
  }
  return mimeTypeFromFileName(fileName);
}

function hasExpired(expiryDate: string | null) {
  if (!expiryDate) return false;
  const endOfExpiryDate = new Date(`${expiryDate}T23:59:59Z`).getTime();
  return endOfExpiryDate < Date.now();
}

function mapStatus(status: string, expiryDate: string | null): ProductDocument["status"] {
  if (status === "expired" || hasExpired(expiryDate)) return "expired";
  if (status === "valid") return "verified";
  if (status === "invalid") return "rejected";
  return "review";
}

function demoDocuments(): PortfolioDocument[] {
  return demoProducts.flatMap((product) =>
    product.documents.map((document, index) => ({
      ...document,
      id: `${product.id}-${document.id}`,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      productCategory: product.category,
      createdAt: new Date(2026, 7, Math.max(1, 18 - index)).toISOString(),
      mimeType: mimeTypeFromFileName(document.name),
    })),
  );
}

const getAuthenticatedDocuments = cache(async (organizationId: string): Promise<PortfolioDocument[]> => {
  const supabase = await createClient();
  const [{ data, error }, { data: analysisRows }] = await Promise.all([
    supabase
      .from("documents")
      .select("*, product:products!documents_product_id_fkey(id, name, sku, category)")
      .eq("org_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("document_analyses")
      .select("*")
      .eq("org_id", organizationId)
      .order("created_at", { ascending: false }),
  ]);

  if (error) throw new Error(`Impossible de charger les documents : ${error.message}`);

  const latestAnalysisByDocument = new Map<string, ReturnType<typeof mapStoredDocumentAnalysis>>();
  for (const row of analysisRows ?? []) {
    if (!latestAnalysisByDocument.has(row.document_id)) latestAnalysisByDocument.set(row.document_id, mapStoredDocumentAnalysis(row));
  }

  return (data ?? []).flatMap((row) => {
    if (!row.product) return [];
    return [{
      id: row.id,
      name: row.title,
      type: row.document_type,
      status: mapStatus(row.status, row.expiry_date),
      uploadedAt: formatDate(row.created_at),
      expiresAt: row.expiry_date ? formatDate(row.expiry_date) : undefined,
      size: documentSize(row.metadata),
      filePath: row.file_path ?? undefined,
      mimeType: documentMimeType(row.metadata, row.title),
      analysis: latestAnalysisByDocument.get(row.id),
      organizationId: row.org_id,
      productId: row.product.id,
      productName: row.product.name,
      productSku: row.product.sku || "Sans référence",
      productCategory: row.product.category || "Catégorie à préciser",
      createdAt: row.created_at,
      expiresOn: row.expiry_date ?? undefined,
      issueDate: row.issue_date ? formatDate(row.issue_date) : undefined,
      issueOn: row.issue_date ?? undefined,
      issuingBody: row.issuing_body ?? undefined,
    } satisfies PortfolioDocument];
  });
});

export async function getWorkspaceDocuments(workspace: WorkspaceContext): Promise<PortfolioDocument[]> {
  if (workspace.mode !== "authenticated" || !workspace.organizationId) return demoDocuments();
  return getAuthenticatedDocuments(workspace.organizationId);
}

export function getDocumentStats(documents: PortfolioDocument[]) {
  const now = Date.now();
  const inThirtyDays = now + 30 * 24 * 60 * 60 * 1000;
  const expiringSoon = documents.filter((document) => {
    if (!document.expiresOn || document.status === "expired") return false;
    const expiry = new Date(`${document.expiresOn}T23:59:59Z`).getTime();
    return expiry >= now && expiry <= inThirtyDays;
  }).length;

  return {
    total: documents.length,
    verified: documents.filter((document) => document.status === "verified").length,
    review: documents.filter((document) => document.status === "review").length,
    alerts: documents.filter((document) => document.status === "expired").length + expiringSoon,
  };
}
