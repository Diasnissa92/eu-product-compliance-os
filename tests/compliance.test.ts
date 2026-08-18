import { describe, expect, it } from "vitest";
import { calculateComplianceScore, countOpenActions, deriveComplianceStatus } from "@/lib/compliance";
import type { Requirement } from "@/lib/types";

const verified: Requirement = {
  id: "verified",
  title: "Déclaration UE",
  description: "Déclaration complète",
  regulation: "LVD",
  status: "verified",
  severity: "blocking",
};

describe("compliance engine", () => {
  it("returns compliant when every requirement is closed", () => {
    expect(deriveComplianceStatus([verified])).toBe("compliant");
    expect(calculateComplianceScore([verified])).toBe(100);
  });

  it("prioritizes a missing blocking requirement", () => {
    const missing = { ...verified, id: "missing", status: "missing" as const };
    expect(deriveComplianceStatus([verified, missing])).toBe("blocking");
    expect(countOpenActions([verified, missing])).toBe(1);
  });

  it("surfaces rejected evidence as a risk", () => {
    const rejected = {
      ...verified,
      id: "rejected",
      status: "rejected" as const,
      severity: "high" as const,
    };
    expect(deriveComplianceStatus([verified, rejected])).toBe("risk");
  });

  it("marks pending evidence as incomplete and weights the score", () => {
    const pending = {
      ...verified,
      id: "pending",
      status: "pending" as const,
      severity: "medium" as const,
    };
    expect(deriveComplianceStatus([verified, pending])).toBe("incomplete");
    expect(calculateComplianceScore([verified, pending])).toBe(82);
  });

  it("returns zero for an empty checklist", () => {
    expect(calculateComplianceScore([])).toBe(0);
  });
});
