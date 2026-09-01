import { NextRequest, NextResponse } from "next/server";
import { getBillingReadiness } from "@/lib/billing";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { stripePost } from "@/lib/stripe-rest";

type PortalSession = { url?: string | null };
type SubscriptionCustomer = { stripe_customer_id: string | null };

export async function POST(request: NextRequest) {
  const workspace = await getWorkspaceContext();
  if (workspace.mode !== "authenticated" || !workspace.organizationId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (!["owner", "admin", "Propriétaire", "Administrateur"].includes(workspace.role)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const readiness = getBillingReadiness();
  if (!readiness.ready) return NextResponse.json({ error: "Billing is not enabled for this service." }, { status: 503 });
  const supabase = await createClient();
  // @ts-expect-error Phase 2 table exists in production; generated types are refreshed separately.
  const { data: rawSubscription, error } = await supabase.from("organization_subscriptions").select("stripe_customer_id").eq("org_id", workspace.organizationId).single();
  const subscription = rawSubscription as SubscriptionCustomer | null;
  if (error || !subscription?.stripe_customer_id) return NextResponse.json({ error: "No Stripe customer is associated with this organization." }, { status: 409 });
  const origin = new URL(request.url).origin;
  const session = await stripePost<PortalSession>(readiness.config.secretKey, "billing_portal/sessions", { customer: subscription.stripe_customer_id, return_url: `${origin}/settings` });
  if (!session.url) return NextResponse.json({ error: "Stripe did not return a portal URL." }, { status: 502 });
  return NextResponse.json({ url: session.url });
}
