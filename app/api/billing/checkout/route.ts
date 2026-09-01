import { NextRequest, NextResponse } from "next/server";
import { assertPaidPlanCode, getBillingReadiness } from "@/lib/billing";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { stripePost } from "@/lib/stripe-rest";

type CheckoutSession = { url?: string | null };

export async function POST(request: NextRequest) {
  try {
    const workspace = await getWorkspaceContext();
    if (workspace.mode !== "authenticated" || !workspace.organizationId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    if (!["owner", "admin", "Propriétaire", "Administrateur"].includes(workspace.role)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    const readiness = getBillingReadiness();
    if (!readiness.ready) return NextResponse.json({ error: "Billing is not enabled for this service.", blockers: readiness.reasons }, { status: 503 });
    const body = await request.json() as { plan?: unknown };
    const plan = assertPaidPlanCode(body.plan);
    const priceId = readiness.config.prices[plan];
    const supabase = await createClient();
    // @ts-expect-error Phase 2 table exists in production; generated types are refreshed after merge.
    const { data: subscription } = await supabase.from("organization_subscriptions").select("stripe_customer_id").eq("org_id", workspace.organizationId).maybeSingle();
    const origin = new URL(request.url).origin;
    const session = await stripePost<CheckoutSession>(readiness.config.secretKey, "checkout/sessions", {
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${origin}/settings?billing=success`,
      cancel_url: `${origin}/settings?billing=cancelled`,
      client_reference_id: workspace.organizationId,
      "metadata[organization_id]": workspace.organizationId,
      "metadata[plan_code]": plan,
      "subscription_data[metadata][organization_id]": workspace.organizationId,
      "subscription_data[metadata][plan_code]": plan,
      customer: subscription?.stripe_customer_id ?? undefined,
      allow_promotion_codes: "true",
    });
    if (!session.url) throw new Error("Stripe did not return a Checkout URL.");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout failed." }, { status: 400 });
  }
}
