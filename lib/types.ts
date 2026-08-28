export type ComplianceStatus = "compliant" | "incomplete" | "risk" | "blocking";
export type RequirementStatus = "verified" | "pending" | "missing" | "rejected" | "not-applicable";
export type RequirementSeverity = "low" | "medium" | "high" | "blocking";
export type TeamRole = "owner" | "admin" | "editor" | "reviewer" | "viewer";

export type TeamMember = {
  userId: string;
  fullName: string;
  initials: string;
  email?: string;
  jobTitle?: string;
  role: TeamRole;
  joinedAt: string;
  status: "active" | "invited";
};

export type RequirementComment = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  createdAt: string;
};

export type DocumentEvidenceQuality = "strong" | "partial" | "weak";
export type DocumentAnalysisStatus = "pending" | "completed" | "failed" | "applied";

export type DocumentRequirementMatch = {
  productRequirementId: string;
  title: string;
  reason: string;
  confidence: number;
};

export type DocumentAnalysisResult = {
  documentType: string;
  suggestedTitle: string | null;
  manufacturerName: string | null;
  productReference: string | null;
  issuingBody: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  standards: string[];
  regulationReferences: string[];
  languageCodes: string[];
  confidence: number;
  evidenceQuality: DocumentEvidenceQuality;
  summary: string;
  warnings: string[];
  requirementMatches: DocumentRequirementMatch[];
};

export type DocumentAnalysis = {
  id: string;
  status: DocumentAnalysisStatus;
  model: string;
  result?: DocumentAnalysisResult;
  errorMessage?: string;
  estimatedCostUsd?: number;
  createdAt: string;
  completedAt?: string;
  appliedAt?: string;
};

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
  assigneeId?: string;
  owner?: string;
  dueDate?: string;
  dueDateValue?: string;
  comments?: RequirementComment[];
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
  mimeType?: string;
  analysis?: DocumentAnalysis;
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
