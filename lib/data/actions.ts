import "server-only";

import type { WorkspaceContext } from "@/lib/auth/workspace";
import { actionSourcesFromProducts, buildComplianceActions, type ComplianceActionSource } from "@/lib/actions";
import { products as demoProducts } from "@/lib/demo-data";
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

export async function getWorkspaceActions(workspace: WorkspaceContext) {
  if (workspace.mode !== "authenticated" || !workspace.organizationId) {
    return buildComplianceActions(actionSourcesFromProducts(demoProducts));
  }

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("product_requirements")
    .select("id, status, assigned_to, due_date, product_id, products!inner(id, name, sku, status), requirements!inner(title, requirement_type, mandatory, regulations!inner(code))")
    .eq("org_id", workspace.organizationId)
    .in("status", ["pending", "missing", "non_compliant"])
    .neq("products.status", "archived")
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) throw new Error(`Impossible de charger les actions : ${error.message}`);

  const assigneeIds = [...new Set((rows ?? []).map((row) => row.assigned_to).filter((value): value is string => Boolean(value)))];
  const { data: profiles, error: profilesError } = assigneeIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", assigneeIds)
    : { data: [], error: null };
  if (profilesError) throw new Error(`Impossible de charger les responsables : ${profilesError.message}`);
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name || "Membre de l’organisation"]));

  const sources: ComplianceActionSource[] = (rows ?? []).map((row) => ({
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
  }));

  return buildComplianceActions(sources);
}
