import type { ComplianceNotification, PortfolioDocument } from "@/lib/types";

const dayInMilliseconds = 86_400_000;

function utcDay(value: Date) {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function daysUntil(date: string, now: Date) {
  const expiry = Date.parse(`${date}T00:00:00Z`);
  return Math.round((expiry - utcDay(now)) / dayInMilliseconds);
}

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function renewalHref(document: PortfolioDocument) {
  return `/documents?edit=${encodeURIComponent(document.id)}`;
}

export function buildDocumentNotifications(
  documents: PortfolioDocument[],
  now = new Date(),
): ComplianceNotification[] {
  return documents.flatMap<ComplianceNotification>((document) => {
    if (document.status === "expired") {
      const elapsed = document.expiresOn ? Math.abs(daysUntil(document.expiresOn, now)) : undefined;
      return [{
        id: `expired-${document.id}`,
        kind: "expired",
        tone: "danger",
        title: "Document expiré",
        detail: elapsed === undefined
          ? `${document.name} n’est plus valide.`
          : `${document.name} a expiré il y a ${elapsed} jour${elapsed > 1 ? "s" : ""}.`,
        documentId: document.id,
        documentName: document.name,
        productId: document.productId,
        productName: document.productName,
        actionHref: renewalHref(document),
        actionLabel: "Planifier le renouvellement",
        dueDate: document.expiresOn,
        daysRemaining: document.expiresOn ? daysUntil(document.expiresOn, now) : undefined,
        createdAt: document.createdAt,
      } satisfies ComplianceNotification];
    }

    if (document.status === "rejected") {
      return [{
        id: `rejected-${document.id}`,
        kind: "rejected",
        tone: "danger",
        title: "Preuve refusée",
        detail: `${document.name} doit être corrigé ou remplacé avant validation.`,
        documentId: document.id,
        documentName: document.name,
        productId: document.productId,
        productName: document.productName,
        actionHref: `/products/${document.productId}#documents`,
        actionLabel: "Ouvrir la preuve",
        createdAt: document.createdAt,
      } satisfies ComplianceNotification];
    }

    if (document.expiresOn) {
      const remaining = daysUntil(document.expiresOn, now);
      if (remaining >= 0 && remaining <= 90) {
        const urgent = remaining <= 30;
        return [{
          id: `expiring-${document.id}`,
          kind: "expiring",
          tone: urgent ? "warning" : "neutral",
          title: remaining === 0 ? "Échéance aujourd’hui" : "Renouvellement à anticiper",
          detail: remaining === 0
            ? `${document.name} arrive à échéance aujourd’hui.`
            : `${document.name} expire le ${formatDueDate(document.expiresOn)} (${remaining} jours).`,
          documentId: document.id,
          documentName: document.name,
          productId: document.productId,
          productName: document.productName,
          actionHref: renewalHref(document),
          actionLabel: "Mettre à jour l’échéance",
          dueDate: document.expiresOn,
          daysRemaining: remaining,
          createdAt: document.createdAt,
        } satisfies ComplianceNotification];
      }
    }

    if (document.status === "review") {
      return [{
        id: `review-${document.id}`,
        kind: "review",
        tone: "neutral",
        title: "Validation en attente",
        detail: `${document.name} est toujours en cours d’analyse.`,
        documentId: document.id,
        documentName: document.name,
        productId: document.productId,
        productName: document.productName,
        actionHref: `/products/${document.productId}#documents`,
        actionLabel: "Examiner la preuve",
        createdAt: document.createdAt,
      } satisfies ComplianceNotification];
    }

    return [];
  }).toSorted((left, right) => {
    const priority = { danger: 0, warning: 1, neutral: 2 } as const;
    const toneOrder = priority[left.tone] - priority[right.tone];
    if (toneOrder !== 0) return toneOrder;
    if (left.daysRemaining !== undefined && right.daysRemaining !== undefined) {
      return left.daysRemaining - right.daysRemaining;
    }
    return right.createdAt.localeCompare(left.createdAt);
  });
}

export function getNotificationStats(notifications: ComplianceNotification[]) {
  return {
    total: notifications.length,
    critical: notifications.filter((notification) => notification.tone === "danger").length,
    deadlines: notifications.filter((notification) => notification.kind === "expiring").length,
    review: notifications.filter((notification) => notification.kind === "review").length,
  };
}
