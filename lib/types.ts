export type ComplianceStatus = "compliant" | "incomplete" | "risk" | "blocking";
export type RequirementStatus = "verified" | "pending" | "missing" | "rejected" | "not-applicable";
export type RequirementSeverity = "low" | "medium" | "high" | "blocking";

export type Requirement = {
  id: string;
  title: string;
  description: string;
  regulation: string;
  status: RequirementStatus;
  severity: RequirementSeverity;
  owner?: string;
  dueDate?: string;
};

export type ProductDocument = {
  id: string;
  name: string;
  type: string;
  status: "verified" | "review" | "expired";
  uploadedAt: string;
  expiresAt?: string;
  size: string;
  filePath?: string;
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
