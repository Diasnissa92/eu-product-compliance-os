import { describe, expect, it } from "vitest";
import { buildComplianceActions, getActionStats, type ComplianceActionSource } from "@/lib/actions";

const baseSource: ComplianceActionSource = {
  id: "requirement-1",
  productId: "product-1",
  productName: "Lampe Luma",
  productSku: "LUM-001",
  title: "Déclaration UE de conformité",
  regulation: "Directive 2014/35/UE",
  status: "pending",
  severity: "blocking",
  assigneeId: "user-1",
  owner: "Sofia Martin",
};

const referenceDate = new Date("2026-08-30T12:00:00.000Z");

describe("compliance action engine", () => {
  it("excludes closed requirements", () => {
    const actions = buildComplianceActions([
      { ...baseSource, status: "verified" },
      { ...baseSource, id: "requirement-2", status: "not-applicable" },
    ], referenceDate);

    expect(actions).toEqual([]);
  });

  it("classifies overdue and seven-day actions", () => {
    const actions = buildComplianceActions([
      { ...baseSource, id: "late", dueDateValue: "2026-08-28" },
      { ...baseSource, id: "soon", dueDateValue: "2026-09-05" },
    ], referenceDate);

    expect(actions.map((action) => [action.id, action.priority, action.daysRemaining])).toEqual([
      ["late", "overdue", -2],
      ["soon", "urgent", 6],
    ]);
  });

  it("keeps requirements without a date visible", () => {
    const [action] = buildComplianceActions([{ ...baseSource, assigneeId: undefined, owner: undefined }], referenceDate);

    expect(action).toMatchObject({ priority: "unscheduled", dueDate: undefined, owner: undefined });
  });

  it("creates a direct link to the relevant requirement", () => {
    const [action] = buildComplianceActions([baseSource], referenceDate);

    expect(action.actionHref).toBe("/products/product-1?requirement=requirement-1#requirement-requirement-1");
  });

  it("summarizes operational priorities", () => {
    const actions = buildComplianceActions([
      { ...baseSource, id: "late", dueDateValue: "2026-08-29" },
      { ...baseSource, id: "soon", dueDateValue: "2026-09-02" },
      { ...baseSource, id: "free", assigneeId: undefined, owner: undefined },
    ], referenceDate);

    expect(getActionStats(actions)).toEqual({ total: 3, overdue: 1, urgent: 1, unassigned: 1 });
  });
});
