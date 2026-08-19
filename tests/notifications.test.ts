import { describe, expect, it } from "vitest";
import { buildDocumentNotifications, getNotificationStats } from "@/lib/notifications";
import type { PortfolioDocument } from "@/lib/types";

const baseDocument: PortfolioDocument = {
  id: "document-1",
  name: "Déclaration UE.pdf",
  type: "Déclaration de conformité",
  status: "verified",
  uploadedAt: "10 août 2026",
  size: "420 Ko",
  productId: "product-1",
  productName: "Lampe Luma",
  productSku: "LUM-001",
  productCategory: "Équipement électrique",
  createdAt: "2026-08-10T10:00:00.000Z",
};

const referenceDate = new Date("2026-08-19T12:00:00.000Z");

describe("document notification engine", () => {
  it("creates a critical alert for an expired document", () => {
    const notifications = buildDocumentNotifications([{
      ...baseDocument,
      status: "expired",
      expiresOn: "2026-08-17",
    }], referenceDate);

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      kind: "expired",
      tone: "danger",
      daysRemaining: -2,
      actionHref: "/documents?edit=document-1",
    });
  });

  it("flags documents expiring within ninety days", () => {
    const notifications = buildDocumentNotifications([{
      ...baseDocument,
      expiresOn: "2026-09-03",
    }], referenceDate);

    expect(notifications[0]).toMatchObject({
      kind: "expiring",
      tone: "warning",
      daysRemaining: 15,
    });
  });

  it("does not alert for a distant verified document", () => {
    const notifications = buildDocumentNotifications([{
      ...baseDocument,
      expiresOn: "2027-08-19",
    }], referenceDate);

    expect(notifications).toEqual([]);
  });

  it("prioritizes rejected evidence before review items", () => {
    const notifications = buildDocumentNotifications([
      { ...baseDocument, id: "review", status: "review" },
      { ...baseDocument, id: "rejected", status: "rejected" },
    ], referenceDate);

    expect(notifications.map((notification) => notification.kind)).toEqual(["rejected", "review"]);
    expect(getNotificationStats(notifications)).toEqual({
      total: 2,
      critical: 1,
      deadlines: 0,
      review: 1,
    });
  });
});
