export type ComplianceStatus = "compliant" | "incomplete" | "risk" | "blocking";
export type RequirementStatus = "verified" | "pending" | "missing" | "rejected" | "not-applicable";
export type RequirementSeverity = "low" | "medium" | "high" | "blocking";

export type Requirement = {
  id: string;
  title: string;
  description: string;
  regulation: string;
  regulationTitle?: string;
  sourceUrl?: string;
  sourceReference?: string;
  applicableReason?: string;
  effectiveFrom?: string;
  lastUpdated?: string;
  status: RequirementStatus;
  severity: RequirementSeverity;
  owner?: string;
  dueDate?: string;
  evidenceDocumentId?: string;
  evidenceDocumentName?: string;
};

export type ProductDocument = {
  id: string;
  name: string;
  type: string;
  status: "verified" | "review" | "rejected" | "expired";
  uploadedAt: string;
  expiresAt?: string;
  size: string;
  filePath?: string;
};

export type PortfolioDocument = ProductDocument & {
  organizationId?: string;
  productId: string;
  productName: string;
  productSku: string;
  productCategory: string;
  createdAt: string;
  expiresOn?: string;
  issueDate?: string;
  issueOn?: string;
  issuingBody?: string;
};

export type ComplianceNotificationKind = "expired" | "expiring" | "rejected" | "review";
export type ComplianceNotificationTone = "danger" | "warning" | "neutral";

export type ComplianceNotification = {
  id: string;
  kind: ComplianceNotificationKind;
  tone: ComplianceNotificationTone;
  title: string;
  detail: string;
  documentId: string;
  documentName: string;
  productId: string;
  productName: string;
  actionHref: string;
  actionLabel: string;
  dueDate?: string;
  daysRemaining?: number;
  createdAt: string;
};

export type PersistenceContext = {
  organizationId: string;
  productId: string;
};

export type AuditEvent = {
  id: string;
  title: string;
  detail: string;
  date: string;
  actor: string;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  manufacturer: string;
  originCountry: string;
  destinationMarkets: string[];
  imageTone: string;
  status: ComplianceStatus;
  score: number;
  updatedAt: string;
  nextDeadline?: string;
  frameworks: string[];
  requirements: Requirement[];
  documents: ProductDocument[];
  audit: AuditEvent[];
};
