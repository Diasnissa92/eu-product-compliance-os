import type { ComplianceStatus, Requirement } from "@/lib/types";

const requirementWeight: Record<Requirement["severity"], number> = {
  low: 1,
  medium: 2,
  high: 3,
  blocking: 4,
};

const completionFactor: Record<Requirement["status"], number> = {
  verified: 1,
  "not-applicable": 1,
  pending: 0.45,
  missing: 0,
  rejected: 0,
};

export function deriveComplianceStatus(requirements: Requirement[]): ComplianceStatus {
  const hasBlockingFailure = requirements.some(
    (item) => item.severity === "blocking" && ["missing", "rejected"].includes(item.status),
  );
  if (hasBlockingFailure) return "blocking";

  const hasRejectedEvidence = requirements.some((item) => item.status === "rejected");
  if (hasRejectedEvidence) return "risk";

  const hasOpenRequirement = requirements.some((item) =>
    ["pending", "missing"].includes(item.status),
  );
  if (hasOpenRequirement) return "incomplete";

  return "compliant";
}

export function calculateComplianceScore(requirements: Requirement[]): number {
  if (requirements.length === 0) return 0;

  const totals = requirements.reduce(
    (accumulator, item) => {
      const weight = requirementWeight[item.severity];
      return {
        earned: accumulator.earned + weight * completionFactor[item.status],
        possible: accumulator.possible + weight,
      };
    },
    { earned: 0, possible: 0 },
  );

  return Math.round((totals.earned / totals.possible) * 100);
}

export function countOpenActions(requirements: Requirement[]): number {
  return requirements.filter((item) => !["verified", "not-applicable"].includes(item.status)).length;
}
