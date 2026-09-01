import { NextRequest, NextResponse } from "next/server";
import { getBillingConfig } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyStripeSignature } from "@/lib/stripe-rest";

type StripeObject = Record<string, unknown> & { id?: string; customer?: string; status?: string; metadata?: Record<string, string>; current_period_end?: number; cancel_at_period_end?: boolean; subscription?: string };
type StripeEvent = { id: string; type: string; data: { object: StripeObject } };

function stringValue(value: unknown) { return typeof value === "string" ? value : null; }

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const { webhookSecret } = getBillingConfig();
  if (!verifyStripeSignature(rawBody, request.headers.get("stripe-signature"), webhookSecret)) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

  let event: StripeEvent;
  try { event = JSON.parse(rawBody) as StripeEvent; } catch { return NextResponse.json({ error: "Invalid payload" }, { status: 400 }); }
  const object = event.data.object;
  const orgId = object.metadata?.organization_id ?? null;
  if (!orgId) return NextResponse.json({ received: true, ignored: "missing_organization_id" });

  const admin = createAdminClient();
  if (event.type === "checkout.session.completed") {
    const customerId = stringValue(object.customer);
    const subscriptionId = stringValue(object.subscription);
    const planCode = object.metadata?.plan_code ?? "free";
    // @ts-expect-error Phase 2 table exists in production; generated types are refreshed after merge.
    const { error } = await admin.from("organization_subscriptions").update({ stripe_customer_id: customerId, stripe_subscription_id: subscriptionId, plan_code: planCode, updated_at: new Date().toISOString() }).eq("org_id", orgId);
    if (error) return NextResponse.json({ error: "Subscription persistence failed" }, { status: 500 });
  }

  if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
    const status = event.type === "customer.subscription.deleted" ? "canceled" : stringValue(object.status) ?? "incomplete";
    const planCode = object.metadata?.plan_code ?? "free";
    const update = {
      stripe_subscription_id: stringValue(object.id),
      stripe_customer_id: stringValue(object.customer),
      plan_code: planCode,
      status,
      current_period_end: typeof object.current_period_end === "number" ? new Date(object.current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: object.cancel_at_period_end === true,
      updated_at: new Date().toISOString(),
    };
    // @ts-expect-error Phase 2 table exists in production; generated types are refreshed after merge.
    const { error } = await admin.from("organization_subscriptions").update(update).eq("org_id", orgId);
    if (error) return NextResponse.json({ error: "Subscription persistence failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
