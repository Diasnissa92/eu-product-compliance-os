import "server-only";

import { getProduct as getDemoProduct, products as demoProducts } from "@/lib/demo-data";
import type { WorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import type { AuditEvent, ComplianceStatus, Product, ProductDocument, Requirement, RequirementSeverity, RequirementStatus } from "@/lib/types";

type ProductRow = Tables<"products">;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function mapComplianceStatus(row: ProductRow): ComplianceStatus {
  if (row.status === "blocked" || row.risk_level === "critical") return "blocking";
  if (row.risk_level === "high") return "risk";
  if (row.status === "ready") return "compliant";
  return "incomplete";
}

function productTone(row: ProductRow) {
  if (row.status === "ready") return "sage";
  if (row.status === "blocked") return "rose";
  if (row.risk_level === "high") return "amber";
  return "blue";
}

function baseProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku || "Sans référence",
    category: row.category || "Catégorie à préciser",
    manufacturer: row.manufacturer_name || "Fabricant à préciser",
    originCountry: row.origin_country || "À préciser",
    destinationMarkets: row.target_markets,
    imageTone: productTone(row),
    status: mapComplianceStatus(row),
    score: row.compliance_score,
    updatedAt: formatDate(row.updated_at),
    frameworks: row.sector === "construction" ? ["CPR", "DPP"] : ["GPSR"],
    requirements: [],
    documents: [],
    audit: [],
  };
}

function mapRequirementStatus(value: string): RequirementStatus {
  if (value === "compliant") return "verified";
  if (value === "non_compliant") return "rejected";
  if (value === "missing") return "missing";
  if (value === "not_applicable") return "not-applicable";
  return "pending";
}

function mapRequirementSeverity(requirementType: string, mandatory: boolean): RequirementSeverity {
  if (!mandatory) return "low";
  if (["document", "test"].includes(requirementType)) return "blocking";
  if (["label", "dpp"].includes(requirementType)) return "high";
  return "medium";
}

function documentSize(metadata: Tables<"documents">["metadata"]) {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata) && typeof metadata.size === "number") {
    return metadata.size > 1_000_000
      ? `${(metadata.size / 1_000_000).toFixed(1)} Mo`
      : `${Math.max(1, Math.ceil(metadata.size / 1000))} Ko`;
  }
  return "Fichier sécurisé";
}

export async function getWorkspaceProducts(workspace: WorkspaceContext) {
  if (workspace.mode !== "authenticated" || !workspace.organizationId) return demoProducts;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("org_id", workspace.organizationId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Impossible de charger les produits: ${error.message}`);
  return (data ?? []).map(baseProduct);
}

export async function getWorkspaceProduct(workspace: WorkspaceContext, productId: string): Promise<Product | undefined> {
  if (workspace.mode !== "authenticated" || !workspace.organizationId) return getDemoProduct(productId);

  const supabase = await createClient();
  const { data: productRow, error } = await supabase
    .from("products")
    .select("*")
    .eq("org_id", workspace.organizationId)
    .eq("id", productId)
    .maybeSingle();

  if (error || !productRow) return undefined;

  const [{ data: requirementRows }, { data: documentRows }, { data: auditRows }] = await Promise.all([
    supabase
      .from("product_requirements")
      .select("id, status, notes, last_checked_at, evidence_document_id, requirements!inner(id, title, description, requirement_type, mandatory, regulations!inner(code, title))")
      .eq("org_id", workspace.organizationId)
      .eq("product_id", productId)
      .order("created_at"),
    supabase.from("documents").select("*").eq("org_id", workspace.organizationId).eq("product_id", productId).order("created_at", { ascending: false }),
    supabase.from("audit_events").select("*").eq("org_id", workspace.organizationId).eq("entity_id", productId).order("created_at", { ascending: false }),
  ]);

  const documents: ProductDocument[] = (documentRows ?? []).map((row) => ({
    id: row.id,
    name: row.title,
    type: row.document_type,
    status: row.status === "valid" ? "verified" : row.status === "invalid" ? "rejected" : row.status === "expired" ? "expired" : "review",
    uploadedAt: formatDate(row.created_at),
    expiresAt: row.expiry_date ? formatDate(row.expiry_date) : undefined,
    size: documentSize(row.metadata),
    filePath: row.file_path ?? undefined,
  }));

  const documentNames = new Map(documents.map((document) => [document.id, document.name]));
  const requirements: Requirement[] = (requirementRows ?? []).map((row) => ({
    id: row.id,
    title: row.requirements.title,
    description: row.requirements.description || "Exigence réglementaire à documenter.",
    regulation: row.requirements.regulations.code,
    status: mapRequirementStatus(row.status),
    severity: mapRequirementSeverity(row.requirements.requirement_type, row.requirements.mandatory),
    dueDate: undefined,
    evidenceDocumentId: row.evidence_document_id ?? undefined,
    evidenceDocumentName: row.evidence_document_id ? documentNames.get(row.evidence_document_id) : undefined,
  }));

  const audit: AuditEvent[] = (auditRows ?? []).map((row) => ({
    id: String(row.id),
    title: row.action,
    detail: `${row.entity_type} · événement enregistré dans le journal sécurisé`,
    date: formatDate(row.created_at),
    actor: row.user_id ? "Utilisateur de l’organisation" : "Système",
  }));

  const product = baseProduct(productRow);
  const frameworks = [...new Set((requirementRows ?? []).map((row) => row.requirements.regulations.code))];
  const upcomingExpiry = (documentRows ?? [])
    .map((row) => row.expiry_date)
    .filter((value): value is string => Boolean(value))
    .sort()[0];

  return {
    ...product,
    requirements,
    documents,
    audit,
    frameworks: frameworks.length ? frameworks : product.frameworks,
    nextDeadline: upcomingExpiry ? formatDate(upcomingExpiry) : undefined,
  };
}

export function getPortfolioStats(products: Product[]) {
  return {
    total: products.length,
    compliant: products.filter((product) => product.status === "compliant").length,
    attention: products.filter((product) => product.status === "incomplete" || product.status === "risk").length,
    blocking: products.filter((product) => product.status === "blocking").length,
    documents: products.reduce((total, product) => total + product.documents.length, 0),
  };
}
