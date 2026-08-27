import "server-only";

import { getProduct as getDemoProduct, products as demoProducts } from "@/lib/demo-data";
import type { WorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { personInitials } from "@/lib/team";
import type { AuditEvent, ComplianceStatus, Product, ProductDocument, Requirement, RequirementComment, RequirementSeverity, RequirementStatus } from "@/lib/types";

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
  const category = `${row.category ?? ""} ${row.sector ?? ""}`.toLocaleLowerCase("fr");
  if (category.includes("construction")) return "rose";
  if (category.includes("jouet")) return "amber";
  if (category.includes("radio") || category.includes("électron")) return "blue";
  if (category.includes("électri") || category.includes("éclairage")) return "sage";
  return "slate";
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

  const [{ data: requirementRows }, { data: documentRows }, { data: auditRows }, { data: commentRows }] = await Promise.all([
    supabase
      .from("product_requirements")
      .select("id, status, notes, last_checked_at, evidence_document_id, assigned_to, due_date, requirements!inner(id, title, description, requirement_type, mandatory, source_reference, effective_from, updated_at, regulations!inner(code, title, source_url, effective_from, updated_at))")
      .eq("org_id", workspace.organizationId)
      .eq("product_id", productId)
      .order("created_at"),
    supabase.from("documents").select("*").eq("org_id", workspace.organizationId).eq("product_id", productId).order("created_at", { ascending: false }),
    supabase.from("audit_events").select("*").eq("org_id", workspace.organizationId).eq("entity_id", productId).order("created_at", { ascending: false }),
    supabase.from("requirement_comments").select("id, product_requirement_id, author_id, body, created_at").eq("org_id", workspace.organizationId).eq("product_id", productId).order("created_at"),
  ]);

  const profileIds = [...new Set([
    ...(requirementRows ?? []).map((row) => row.assigned_to).filter((value): value is string => Boolean(value)),
    ...(commentRows ?? []).map((row) => row.author_id),
  ])];
  const { data: collaborationProfiles } = profileIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", profileIds)
    : { data: [] };
  const profileNames = new Map((collaborationProfiles ?? []).map((profile) => [profile.id, profile.full_name || "Membre de l’organisation"]));
  const commentsByRequirement = new Map<string, RequirementComment[]>();
  for (const comment of commentRows ?? []) {
    const authorName = profileNames.get(comment.author_id) || "Membre de l’organisation";
    const mappedComment: RequirementComment = {
      id: comment.id,
      body: comment.body,
      authorId: comment.author_id,
      authorName,
      authorInitials: personInitials(authorName),
      createdAt: formatDate(comment.created_at),
    };
    commentsByRequirement.set(comment.product_requirement_id, [...(commentsByRequirement.get(comment.product_requirement_id) ?? []), mappedComment]);
  }

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
    regulationTitle: row.requirements.regulations.title,
    sourceUrl: row.requirements.regulations.source_url,
    sourceReference: row.requirements.source_reference ?? undefined,
    applicableReason: productRow.category
      ? `Exigence identifiée pour la catégorie « ${productRow.category} » et les marchés sélectionnés.`
      : "Exigence identifiée à partir de la qualification réglementaire du produit.",
    effectiveFrom: row.requirements.effective_from
      ? formatDate(row.requirements.effective_from)
      : row.requirements.regulations.effective_from
        ? formatDate(row.requirements.regulations.effective_from)
        : undefined,
    lastUpdated: formatDate(row.requirements.updated_at || row.requirements.regulations.updated_at),
    status: mapRequirementStatus(row.status),
    severity: mapRequirementSeverity(row.requirements.requirement_type, row.requirements.mandatory),
    assigneeId: row.assigned_to ?? undefined,
    owner: row.assigned_to ? profileNames.get(row.assigned_to) : undefined,
    dueDate: row.due_date ? formatDate(row.due_date) : undefined,
    dueDateValue: row.due_date ?? undefined,
    comments: commentsByRequirement.get(row.id) ?? [],
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
