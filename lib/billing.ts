import "server-only";
import { isLegalLaunchReady } from "@/lib/legal-config";

export type PaidPlanCode = "starter" | "pro" | "business";

export const BILLING_PLANS = {
  starter: { label: "Starter", priceEnv: "STRIPE_PRICE_STARTER" },
  pro: { label: "Pro", priceEnv: "STRIPE_PRICE_PRO" },
  business: { label: "Business", priceEnv: "STRIPE_PRICE_BUSINESS" },
} as const;

export function getBillingConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  const prices = Object.fromEntries(Object.entries(BILLING_PLANS).map(([code, plan]) => [code, process.env[plan.priceEnv]?.trim() ?? ""])) as Record<PaidPlanCode, string>;
  return { secretKey, webhookSecret, prices };
}

export function getBillingReadiness() {
  const config = getBillingConfig();
  const reasons: string[] = [];
  if (!isLegalLaunchReady()) reasons.push("legal_identity_incomplete");
  if (!config.secretKey) reasons.push("stripe_secret_missing");
  if (!config.webhookSecret) reasons.push("stripe_webhook_secret_missing");
  for (const code of Object.keys(BILLING_PLANS) as PaidPlanCode[]) {
    if (!config.prices[code]) reasons.push(`stripe_price_${code}_missing`);
  }
  return { ready: reasons.length === 0, reasons, config };
}

export function assertPaidPlanCode(value: unknown): PaidPlanCode {
  if (value === "starter" || value === "pro" || value === "business") return value;
  throw new Error("Unsupported billing plan.");
}
