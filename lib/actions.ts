import type { ComplianceAction, Product, RequirementSeverity, RequirementStatus } from "@/lib/types";

const dayInMilliseconds = 86_400_000;

export type ComplianceActionSource = {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  title: string;
  regulation: string;
  status: RequirementStatus;
  severity: RequirementSeverity;
  assigneeId?: string;
  owner?: string;
  dueDateValue?: string;
  requirementId?: string;
  actionHref?: string;
};

function utcDay(value: Date) {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function daysUntil(value: string, now: Date) {
  return Math.round((Date.parse(`${value}T00:00:00Z`) - utcDay(now)) / dayInMilliseconds);
}

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function actionSourcesFromProducts(products: Product[]): ComplianceActionSource[] {
  return products.flatMap((product) => product.requirements.map((requirement) => ({
    id: requirement.id,
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    title: requirement.title,
    regulation: requirement.regulation,
    status: requirement.status,
    severity: requirement.severity,
    assigneeId: requirement.assigneeId,
    owner: requirement.owner,
    dueDateValue: requirement.dueDateValue,
    requirementId: requirement.id,
  })));
}

export function buildComplianceActions(sources: ComplianceActionSource[], now = new Date()): ComplianceAction[] {
  const priorityOrder = { overdue: 0, urgent: 1, planned: 2, unscheduled: 3 } as const;
  const severityOrder = { blocking: 0, high: 1, medium: 2, low: 3 } as const;

  return sources.flatMap<ComplianceAction>((source) => {
    if (source.status === "verified" || source.status === "not-applicable") return [];

    const remaining = source.dueDateValue ? daysUntil(source.dueDateValue, now) : undefined;
    const priority = remaining === undefined
      ? "unscheduled"
      : remaining < 0
        ? "overdue"
        : remaining <= 7
          ? "urgent"
          : "planned";

    return [{
      id: source.id,
      productId: source.productId,
      productName: source.productName,
      productSku: source.productSku,
      requirementId: source.requirementId ?? source.id,
      title: source.title,
      regulation: source.regulation,
      status: source.status,
      severity: source.severity,
      assigneeId: source.assigneeId,
      owner: source.owner,
      dueDate: source.dueDateValue ? formatDueDate(source.dueDateValue) : undefined,
      dueDateValue: source.dueDateValue,
      daysRemaining: remaining,
      priority,
      actionHref: source.actionHref ?? `/products/${encodeURIComponent(source.productId)}?requirement=${encodeURIComponent(source.requirementId ?? source.id)}#requirement-${encodeURIComponent(source.requirementId ?? source.id)}`,
    }];
  }).toSorted((left, right) => {
    const priority = priorityOrder[left.priority] - priorityOrder[right.priority];
    if (priority !== 0) return priority;
    if (left.dueDateValue && right.dueDateValue) return left.dueDateValue.localeCompare(right.dueDateValue);
    const severity = severityOrder[left.severity] - severityOrder[right.severity];
    if (severity !== 0) return severity;
    return left.productName.localeCompare(right.productName, "fr");
  });
}

export function getActionStats(actions: ComplianceAction[]) {
  return {
    total: actions.length,
    overdue: actions.filter((action) => action.priority === "overdue").length,
    urgent: actions.filter((action) => action.priority === "urgent").length,
    unassigned: actions.filter((action) => !action.assigneeId).length,
  };
}
