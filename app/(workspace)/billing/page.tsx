import { CreditCard } from "lucide-react";
import { redirect } from "next/navigation";
import { BillingPlans } from "@/components/billing/billing-plans";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { getBillingReadiness } from "@/lib/billing";
import { createClient } from "@/lib/supabase/server";

type SubscriptionRow = {
  plan_code: string;
  status: string;
  stripe_customer_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export const metadata = { title: "Abonnement · EU Product Compliance OS" };

export default async function BillingPage() {
  const workspace = await getWorkspaceContext();
  if (workspace.mode !== "authenticated" || !workspace.organizationId) redirect("/login");
  const supabase = await createClient();
  // @ts-expect-error Phase 2 table exists in production; generated types are refreshed separately.
  const { data: rawSubscription } = await supabase.from("organization_subscriptions").select("plan_code,status,stripe_customer_id,current_period_end,cancel_at_period_end").eq("org_id", workspace.organizationId).maybeSingle();
  const subscription = rawSubscription as SubscriptionRow | null;
  const readiness = getBillingReadiness();
  return <main>
    <section className="page-heading"><div><span className="eyebrow">Compte organisation</span><h1>Abonnement et facturation</h1><p>L’état affiché provient de la base synchronisée par webhook Stripe. Aucune donnée brute de carte n’est stockée par UE Conformité.</p></div><span className="heading-symbol heading-symbol-blue"><CreditCard size={25}/></span></section>
    <section className="panel professional-list-panel"><div className="professional-panel-heading compact"><div><span className="eyebrow">État courant</span><h2>{subscription?.plan_code ?? "free"}</h2></div><span className="professional-status status-open">{subscription?.status ?? "free"}</span></div>{subscription?.current_period_end ? <p>Prochaine échéance de période : {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(subscription.current_period_end))}{subscription.cancel_at_period_end ? " · résiliation programmée" : ""}</p> : <p>Aucun abonnement payant actif.</p>}</section>
    <BillingPlans enabled={readiness.ready} currentPlan={subscription?.plan_code ?? "free"} hasCustomer={Boolean(subscription?.stripe_customer_id)}/>
  </main>;
}
