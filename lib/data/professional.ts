import "server-only";

import { cache } from "react";
import type { WorkspaceContext } from "@/lib/auth/workspace";
import {
  demoProfessionalData,
  recordFromJson,
  type ProfessionalOperationsData,
} from "@/lib/professional";
import { createClient } from "@/lib/supabase/server";

function valueOrUndefined<T>(value: T | null): T | undefined {
  return value ?? undefined;
}

export const getProfessionalOperationsData = cache(async function getProfessionalOperationsData(
  workspace: WorkspaceContext,
): Promise<ProfessionalOperationsData> {
  if (workspace.mode !== "authenticated" || !workspace.organizationId) return demoProfessionalData;

  const supabase = await createClient();
  const orgId = workspace.organizationId;
  const [products, requests, responses, audits, watches, matches, incidents, actions, imports] = await Promise.all([
    supabase.from("products").select("id, name, sku, category, manufacturer_name, origin_country, target_markets, compliance_score, dpp_identifier, dpp_status, dpp_public_data").eq("org_id", orgId).order("updated_at", { ascending: false }),
    supabase.from("supplier_requests").select("id, product_id, supplier_name, supplier_email, subject, requested_items, message, due_date, status, access_token, submitted_at, created_at").eq("org_id", orgId).order("created_at", { ascending: false }),
    supabase.from("supplier_responses").select("id, request_id, document_name, document_url, supplier_name, status, submitted_at").eq("org_id", orgId).order("submitted_at", { ascending: false }),
    supabase.from("ecommerce_audits").select("id, product_id, marketplace, listing_url, score, status, findings, created_at").eq("org_id", orgId).order("created_at", { ascending: false }),
    supabase.from("safety_gate_watches").select("id, product_id, label, keywords, category, enabled, last_checked_at, last_result_count").eq("org_id", orgId).order("created_at", { ascending: false }),
    supabase.from("safety_gate_matches").select("id, product_id, watch_id, alert_reference, title, risk_level, alert_url, matched_terms, status, detected_at").eq("org_id", orgId).order("detected_at", { ascending: false }),
    supabase.from("product_incidents").select("id, product_id, title, reference, source, severity, status, description, countries, affected_units, recall_required, occurred_at, detected_at").eq("org_id", orgId).order("detected_at", { ascending: false }),
    supabase.from("corrective_actions").select("id, incident_id, title, priority, status, due_date").eq("org_id", orgId).order("created_at", { ascending: false }),
    supabase.from("product_imports").select("id, file_name, total_rows, created_rows, skipped_rows, created_at").eq("org_id", orgId).order("created_at", { ascending: false }).limit(20),
  ]);

  const failure = [products, requests, responses, audits, watches, matches, incidents, actions, imports].find((result) => result.error);
  if (failure?.error) throw new Error(`Chargement des opérations impossible : ${failure.error.message}`);

  return {
    products: (products.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku || "Sans référence",
      category: row.category || "Catégorie à préciser",
      manufacturer: row.manufacturer_name || "Fabricant à préciser",
      originCountry: row.origin_country || "À préciser",
      targetMarkets: row.target_markets,
      complianceScore: row.compliance_score,
      dppIdentifier: valueOrUndefined(row.dpp_identifier),
      dppStatus: row.dpp_status,
      dppPublicData: recordFromJson(row.dpp_public_data),
    })),
    supplierRequests: (requests.data ?? []).map((row) => ({
      id: row.id,
      productId: row.product_id,
      supplierName: row.supplier_name,
      supplierEmail: row.supplier_email,
      subject: row.subject,
      requestedItems: row.requested_items,
      message: valueOrUndefined(row.message),
      dueDate: valueOrUndefined(row.due_date),
      status: row.status,
      accessToken: row.access_token,
      submittedAt: valueOrUndefined(row.submitted_at),
      createdAt: row.created_at,
    })),
    supplierResponses: (responses.data ?? []).map((row) => ({
      id: row.id,
      requestId: row.request_id,
      documentName: row.document_name,
      documentUrl: row.document_url,
      supplierName: row.supplier_name,
      status: row.status,
      submittedAt: row.submitted_at,
    })),
    ecommerceAudits: (audits.data ?? []).map((row) => ({
      id: row.id,
      productId: row.product_id,
      marketplace: row.marketplace,
      listingUrl: valueOrUndefined(row.listing_url),
      score: row.score,
      status: row.status,
      findings: row.findings,
      createdAt: row.created_at,
    })),
    safetyGateWatches: (watches.data ?? []).map((row) => ({
      id: row.id,
      productId: valueOrUndefined(row.product_id),
      label: row.label,
      keywords: row.keywords,
      category: valueOrUndefined(row.category),
      enabled: row.enabled,
      lastCheckedAt: valueOrUndefined(row.last_checked_at),
      lastResultCount: row.last_result_count,
    })),
    safetyGateMatches: (matches.data ?? []).map((row) => ({
      id: row.id,
      productId: valueOrUndefined(row.product_id),
      watchId: valueOrUndefined(row.watch_id),
      alertReference: row.alert_reference,
      title: row.title,
      riskLevel: row.risk_level,
      alertUrl: row.alert_url,
      matchedTerms: row.matched_terms,
      status: row.status,
      detectedAt: row.detected_at,
    })),
    incidents: (incidents.data ?? []).map((row) => ({
      id: row.id,
      productId: valueOrUndefined(row.product_id),
      title: row.title,
      reference: valueOrUndefined(row.reference),
      source: row.source,
      severity: row.severity,
      status: row.status,
      description: row.description,
      countries: row.countries,
      affectedUnits: valueOrUndefined(row.affected_units),
      recallRequired: row.recall_required,
      occurredAt: valueOrUndefined(row.occurred_at),
      detectedAt: row.detected_at,
    })),
    correctiveActions: (actions.data ?? []).map((row) => ({
      id: row.id,
      incidentId: row.incident_id,
      title: row.title,
      priority: row.priority,
      status: row.status,
      dueDate: valueOrUndefined(row.due_date),
    })),
    imports: (imports.data ?? []).map((row) => ({
      id: row.id,
      fileName: row.file_name,
      totalRows: row.total_rows,
      createdRows: row.created_rows,
      skippedRows: row.skipped_rows,
      createdAt: row.created_at,
    })),
  };
});

