import type { Json } from "@/lib/supabase/database.types";

export type ProfessionalProduct = {
  id: string;
  name: string;
  sku: string;
  category: string;
  manufacturer: string;
  originCountry: string;
  targetMarkets: string[];
  complianceScore: number;
  dppIdentifier?: string;
  dppStatus: string;
  dppPublicData: Record<string, Json | undefined>;
};

export type SupplierRequestRecord = {
  id: string;
  productId: string;
  supplierName: string;
  supplierEmail: string;
  subject: string;
  requestedItems: string[];
  message?: string;
  dueDate?: string;
  status: string;
  accessToken: string;
  submittedAt?: string;
  createdAt: string;
};

export type SupplierResponseRecord = {
  id: string;
  requestId: string;
  documentName: string;
  documentUrl: string;
  supplierName: string;
  status: string;
  submittedAt: string;
};

export type EcommerceAuditRecord = {
  id: string;
  productId: string;
  marketplace: string;
  listingUrl?: string;
  score: number;
  status: string;
  findings: Json;
  createdAt: string;
};

export type SafetyGateWatchRecord = {
  id: string;
  productId?: string;
  label: string;
  keywords: string[];
  category?: string;
  enabled: boolean;
  lastCheckedAt?: string;
  lastResultCount: number;
};

export type SafetyGateMatchRecord = {
  id: string;
  productId?: string;
  watchId?: string;
  alertReference: string;
  title: string;
  riskLevel: string;
  alertUrl: string;
  matchedTerms: string[];
  status: string;
  detectedAt: string;
};

export type IncidentRecord = {
  id: string;
  productId?: string;
  title: string;
  reference?: string;
  source: string;
  severity: string;
  status: string;
  description: string;
  countries: string[];
  affectedUnits?: number;
  recallRequired: boolean;
  occurredAt?: string;
  detectedAt: string;
};

export type CorrectiveActionRecord = {
  id: string;
  incidentId: string;
  title: string;
  priority: string;
  status: string;
  dueDate?: string;
};

export type ProductImportRecord = {
  id: string;
  fileName: string;
  totalRows: number;
  createdRows: number;
  skippedRows: number;
  createdAt: string;
};

export type ProfessionalOperationsData = {
  products: ProfessionalProduct[];
  supplierRequests: SupplierRequestRecord[];
  supplierResponses: SupplierResponseRecord[];
  ecommerceAudits: EcommerceAuditRecord[];
  safetyGateWatches: SafetyGateWatchRecord[];
  safetyGateMatches: SafetyGateMatchRecord[];
  incidents: IncidentRecord[];
  correctiveActions: CorrectiveActionRecord[];
  imports: ProductImportRecord[];
};

export const demoProfessionalData: ProfessionalOperationsData = {
  products: [
    {
      id: "luma-mini",
      name: "Lampe Luma Mini",
      sku: "LUM-204-FR",
      category: "Équipement électrique",
      manufacturer: "Nordhavn Design ApS",
      originCountry: "Danemark",
      targetMarkets: ["France", "Belgique", "Allemagne"],
      complianceScore: 74,
      dppIdentifier: "EUCP-LUM-204-FR",
      dppStatus: "draft",
      dppPublicData: {},
    },
  ],
  supplierRequests: [],
  supplierResponses: [],
  ecommerceAudits: [],
  safetyGateWatches: [],
  safetyGateMatches: [],
  incidents: [],
  correctiveActions: [],
  imports: [],
};

export function recordFromJson(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

