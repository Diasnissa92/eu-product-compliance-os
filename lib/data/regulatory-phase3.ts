import "server-only";

import type { WorkspaceContext } from "@/lib/auth/workspace";
import { REGULATORY_ENGINE_VERSION } from "@/lib/regulatory-engine";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

export type StoredRegulatoryAssessment = {
  regulationCode: string;
  outcome: "applicable" | "not_applicable" | "needs_information" | "human_review";
  rationale: string;
  sourceUrl: string;
  sourceReference: string;
  assessedAt: string;
};

export type StoredRegulatoryAction = {
  id: string;
  actionKey: string;
  regulationCode: string;
  title: string;
  kind: "information" | "review" | "evidence";
  severity: "medium" | "high" | "blocking";
  status: "open" | "in_progress" | "done" | "dismissed";
  sourceUrl: string;
  sourceReference: string;
  assigneeId?: string;
  dueDate?: string;
};

export type ProductRegulatorySnapshot = {
  engineVersion: string;
  assessments: StoredRegulatoryAssessment[];
  actions: StoredRegulatoryAction[];
  profile: Record<string, unknown>;
  ecommerceAuditCount: number;
  supplierRequestCount: number;
  passportPublished: boolean;
};

export type ProductJourneyStep = {
  key: string;
  number: string;
  title: string;
  detail: string;
  href: string;
  state: "complete" | "current" | "todo" | "contextual";
};

export type ProductJourneyState = {
  steps: ProductJourneyStep[];
  missingInformation: number;
  humanReviews: number;
  openActions: number;
  blockingActions: number;
  readyForSynthesis: boolean;
};

function parseAssessmentOutcome(value: string): StoredRegulatoryAssessment["outcome"] {
  switch (value) {
    case "applicable":
      return "applicable";
    case "not_applicable":
      return "not_applicable";
    case "needs_information":
      return "needs_information";
    case "human_review":
      return "human_review";
    default:
      throw new Error(`Conclusion réglementaire inconnue : ${value}`);
  }
}

function parseActionKind(value: string): StoredRegulatoryAction["kind"] {
  switch (value) {
    case "information":
      return "information";
    case "review":
      return "review";
    case "evidence":
      return "evidence";
    default:
      throw new Error(`Type d’action réglementaire inconnu : ${value}`);
  }
}

function parseActionSeverity(value: string): StoredRegulatoryAction["severity"] {
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

function parseActionStatus(value: string): StoredRegulatoryAction["status"] {
  switch (value) {
    case "open":
      return "open";
    case "in_progress":
      return "in_progress";
    case "done":
      return "done";
    case "dismissed":
      return "dismissed";
    default:
      throw new Error(`Statut d’action réglementaire inconnu : ${value}`);
  }
}

export async function getProductRegulatorySnapshot(workspace: WorkspaceContext, productId: string): Promise<ProductRegulatorySnapshot> {
  if (workspace.mode !== "authenticated" || !workspace.organizationId) {
    return {
      engineVersion: REGULATORY_ENGINE_VERSION,
      assessments: [],
      actions: [],
      profile: {},
      ecommerceAuditCount: 0,
      supplierRequestCount: 0,
      passportPublished: false,
    };
  }

  const supabase = await createClient();
  const assessmentsPromise = supabase.from("product_regulatory_assessments")
    .select("regulation_code,outcome,rationale,source_url,source_reference,assessed_at")
    .eq("org_id", workspace.organizationId)
    .eq("product_id", productId)
    .eq("engine_version", REGULATORY_ENGINE_VERSION)
    .order("assessed_at", { ascending: false });
  const actionsPromise = supabase.from("regulatory_action_items")
    .select("id,action_key,regulation_code,title,kind,severity,status,source_url,source_reference,assignee_id,due_date")
    .eq("org_id", workspace.organizationId)
    .eq("product_id", productId)
    .eq("engine_version", REGULATORY_ENGINE_VERSION)
    .order("created_at", { ascending: true });
  const ecommercePromise = supabase.from("ecommerce_audits").select("id", { count: "exact", head: true }).eq("org_id", workspace.organizationId).eq("product_id", productId);
  const supplierPromise = supabase.from("supplier_requests").select("id", { count: "exact", head: true }).eq("org_id", workspace.organizationId).eq("product_id", productId);
  const productPromise = supabase.from("products").select("regulatory_profile,dpp_status").eq("org_id", workspace.organizationId).eq("id", productId).maybeSingle();

  const [assessmentsResult, actionsResult, ecommerceResult, supplierResult, productResult] = await Promise.all([
    assessmentsPromise,
    actionsPromise,
    ecommercePromise,
    supplierPromise,
    productPromise,
  ]);

  const firstError = assessmentsResult.error ?? actionsResult.error ?? ecommerceResult.error ?? supplierResult.error ?? productResult.error;
  if (firstError) throw new Error(`Impossible de charger le parcours réglementaire : ${firstError.message}`);

  return {
    engineVersion: REGULATORY_ENGINE_VERSION,
    assessments: (assessmentsResult.data ?? []).map((row) => ({
      regulationCode: row.regulation_code,
      outcome: parseAssessmentOutcome(row.outcome),
      rationale: row.rationale,
      sourceUrl: row.source_url,
      sourceReference: row.source_reference ?? "Référence officielle non précisée",
      assessedAt: row.assessed_at,
    })),
    actions: (actionsResult.data ?? []).map((row) => ({
      id: row.id,
      actionKey: row.action_key,
      regulationCode: row.regulation_code,
      title: row.title,
      kind: parseActionKind(row.kind),
      severity: parseActionSeverity(row.severity),
      status: parseActionStatus(row.status),
      sourceUrl: row.source_url,
      sourceReference: row.source_reference,
      assigneeId: row.assignee_id ?? undefined,
      dueDate: row.due_date ?? undefined,
    })),
    profile: productResult.data?.regulatory_profile && typeof productResult.data.regulatory_profile === "object" && !Array.isArray(productResult.data.regulatory_profile)
      ? productResult.data.regulatory_profile as Record<string, unknown>
      : {},
    ecommerceAuditCount: ecommerceResult.count ?? 0,
    supplierRequestCount: supplierResult.count ?? 0,
    passportPublished: productResult.data?.dpp_status === "published",
  };
}

export function buildProductJourney(product: Product, snapshot: ProductRegulatorySnapshot): ProductJourneyState {
  const missingInformation = snapshot.assessments.filter((item) => item.outcome === "needs_information").length;
  const humanReviews = snapshot.assessments.filter((item) => item.outcome === "human_review").length;
  const openActions = snapshot.actions.filter((item) => item.status === "open" || item.status === "in_progress").length;
  const blockingActions = snapshot.actions.filter((item) => (item.status === "open" || item.status === "in_progress") && item.severity === "blocking").length;
  const identificationComplete = Boolean(product.name && product.sku && product.manufacturer && product.originCountry && product.destinationMarkets.length);
  const qualificationStarted = snapshot.assessments.length > 0;
  const qualificationComplete = qualificationStarted && missingInformation === 0;
  const actionsComplete = qualificationComplete && openActions === 0;
  const evidenceComplete = product.documents.length > 0 && !product.documents.some((document) => document.status === "rejected" || document.status === "expired");
  const distanceSale = snapshot.profile.distanceSale === true;
  const distributionComplete = !distanceSale || snapshot.ecommerceAuditCount > 0;
  const readyForSynthesis = identificationComplete && qualificationComplete && blockingActions === 0;

  const steps: ProductJourneyStep[] = [
    {
      key: "identity",
      number: "01",
      title: "Identifier le produit",
      detail: identificationComplete ? "Identité, fabricant, origine et marchés renseignés." : "Compléter l’identité, le fabricant, l’origine et les marchés visés.",
      href: `/products/${product.id}#overview`,
      state: identificationComplete ? "complete" : "current",
    },
    {
      key: "qualification",
      number: "02",
      title: "Qualifier les cadres applicables",
      detail: !qualificationStarted ? "Lancer le questionnaire réglementaire factuel." : missingInformation ? `${missingInformation} information${missingInformation > 1 ? "s" : ""} reste${missingInformation > 1 ? "nt" : ""} à compléter.` : `${humanReviews} revue${humanReviews > 1 ? "s" : ""} humaine${humanReviews > 1 ? "s" : ""} identifiée${humanReviews > 1 ? "s" : ""}.`,
      href: `/products/${product.id}/regulatory`,
      state: qualificationComplete ? "complete" : qualificationStarted ? "current" : identificationComplete ? "current" : "todo",
    },
    {
      key: "actions",
      number: "03",
      title: "Traiter le plan d’actions",
      detail: !qualificationStarted ? "Le plan sera généré après qualification." : openActions ? `${openActions} action${openActions > 1 ? "s" : ""} ouverte${openActions > 1 ? "s" : ""}, dont ${blockingActions} bloquante${blockingActions > 1 ? "s" : ""}.` : "Aucune action de qualification ouverte pour cette version du moteur.",
      href: "/actions",
      state: actionsComplete ? "complete" : qualificationStarted ? "current" : "todo",
    },
    {
      key: "evidence",
      number: "04",
      title: "Constituer les preuves",
      detail: product.documents.length ? `${product.documents.length} document${product.documents.length > 1 ? "s" : ""} enregistré${product.documents.length > 1 ? "s" : ""}.` : "Ajouter puis analyser les documents techniques, déclarations, essais et notices disponibles.",
      href: `/products/${product.id}#documents`,
      state: evidenceComplete ? "complete" : qualificationStarted ? "current" : "todo",
    },
    {
      key: "distribution",
      number: "05",
      title: "Contrôler fournisseurs et canaux de vente",
      detail: distanceSale ? snapshot.ecommerceAuditCount ? "Au moins un audit e-commerce est enregistré pour ce produit." : "La vente à distance est déclarée : un audit GPSR de l’offre doit être réalisé." : snapshot.supplierRequestCount ? `${snapshot.supplierRequestCount} demande${snapshot.supplierRequestCount > 1 ? "s" : ""} fournisseur liée${snapshot.supplierRequestCount > 1 ? "s" : ""} au produit.` : "Étape contextuelle : fournisseur et vente à distance selon votre modèle de distribution.",
      href: distanceSale ? "/ecommerce" : "/suppliers",
      state: distanceSale ? distributionComplete ? "complete" : "current" : "contextual",
    },
    {
      key: "synthesis",
      number: "06",
      title: "Produire la synthèse traçable",
      detail: readyForSynthesis ? "La synthèse peut être générée. Elle reste une photographie du dossier, pas une certification." : "La synthèse finale attend encore la qualification et la résolution des blocages critiques.",
      href: `/products/${product.id}/report`,
      state: readyForSynthesis ? "complete" : "todo",
    },
  ];

  return { steps, missingInformation, humanReviews, openActions, blockingActions, readyForSynthesis };
}
