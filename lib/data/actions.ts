import "server-only";

import type { WorkspaceContext } from "@/lib/auth/workspace";
import { actionSourcesFromProducts, buildComplianceActions, type ComplianceActionSource } from "@/lib/actions";
import { products as demoProducts } from "@/lib/demo-data";
import { REGULATORY_ENGINE_VERSION } from "@/lib/regulatory-engine";
import { createClient } from "@/lib/supabase/server";
import type { RequirementSeverity, RequirementStatus } from "@/lib/types";

function mapStatus(value: string): RequirementStatus {
  if (value === "compliant") return "verified";
  if (value === "non_compliant") return "rejected";
  if (value === "missing") return "missing";
  if (value === "not_applicable") return "not-applicable";
  return "pending";
}

function mapSeverity(requirementType: string, mandatory: boolean): RequirementSeverity {
  if (!mandatory) return "low";
  if (["document", "test"].includes(requirementType)) return "blocking";
  if (["label", "dpp"].includes(requirementType)) return "high";
  return "medium";
}

function parseRegulatorySeverity(value: string): RequirementSeverity {
  switch (value) {
    case "medium":
      return "medium";
    case "high":
      return "high";
    case "blocking":
      return "blocking";
    default:
      throw new Error(`Niveau d’action réglementaire inconnu : ${value}`);
  }
}

export async function getWorkspaceActions(workspace: WorkspaceContext) {
  if (workspace.mode !== "authenticated" || !workspace.organizationId) {
    return buildComplianceActions(actionSourcesFromProducts(demoProducts));
  }

  const supabase = await createClient();
  const requirementsPromise = supabase
    .from("product_requirements")
    .select("id, status, assigned_to, due_date, product_id, products!inner(id, name, sku, status), requirements!inner(title, requirement_type, mandatory, regulations!inner(code))")
    .eq("org_id", workspace.organizationId)
    .in("status", ["pending", "missing", "non_compliant"])
    .neq("products.status", "archived")
    .order("due_date", { ascending: true, nullsFirst: false });

  const regulatoryPromise = supabase.from("regulatory_action_items")
    .select("id,title,regulation_code,severity,status,assignee_id,due_date,product_id,products!inner(id,name,sku,status)")
    .eq("org_id", workspace.organizationId)
    .eq("engine_version", REGULATORY_ENGINE_VERSION)
    .in("status", ["open", "in_progress"])
    .neq("products.status", "archived")
    .order("due_date", { ascending: true, nullsFirst: false });

  const [requirementsResult, regulatoryResult] = await Promise.all([requirementsPromise, regulatoryPromise]);
  if (requirementsResult.error) throw new Error(`Impossible de charger les actions : ${requirementsResult.error.message}`);
  if (regulatoryResult.error) throw new Error(`Impossible de charger les actions réglementaires : ${regulatoryResult.error.message}`);

  const requirementRows = requirementsResult.data ?? [];
  const regulatoryRows = regulatoryResult.data ?? [];
  const assigneeIds = [...new Set([
    ...requirementRows.map((row) => row.assigned_to),
    ...regulatoryRows.map((row: { assignee_id: string | null }) => row.assignee_id),
  ].filter((value): value is string => Boolean(value)))];
  const { data: profiles, error: profilesError } = assigneeIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", assigneeIds)
    : { data: [], error: null };
  if (profilesError) throw new Error(`Impossible de charger les responsables : ${profilesError.message}`);
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name || "Membre de l’organisation"]));

  const requirementSources: ComplianceActionSource[] = requirementRows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    productName: row.products.name,
    productSku: row.products.sku || "Sans référence",
    title: row.requirements.title,
    regulation: row.requirements.regulations.code,
    status: mapStatus(row.status),
    severity: mapSeverity(row.requirements.requirement_type, row.requirements.mandatory),
    assigneeId: row.assigned_to ?? undefined,
    owner: row.assigned_to ? names.get(row.assigned_to) : undefined,
    dueDateValue: row.due_date ?? undefined,
    requirementId: row.id,
  }));

  const regulatorySources: ComplianceActionSource[] = regulatoryRows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    productName: row.products.name,
    productSku: row.products.sku || "Sans référence",
    title: row.title,
    regulation: row.regulation_code,
    status: row.status === "done" ? "verified" : row.status === "dismissed" ? "not-applicable" : "pending",
    severity: parseRegulatorySeverity(row.severity),
    assigneeId: row.assignee_id ?? undefined,
    owner: row.assignee_id ? names.get(row.assignee_id) : undefined,
    dueDateValue: row.due_date ?? undefined,
    actionHref: `/products/${encodeURIComponent(row.product_id)}/regulatory`,
  }));

  return buildComplianceActions([...requirementSources, ...regulatorySources]);
}
