"use client";

import { ArrowRight, CreditCard, ExternalLink } from "lucide-react";
import { useState } from "react";

type Plan = "starter" | "pro" | "business";

export function BillingPlans({ enabled, currentPlan, hasCustomer }: { enabled: boolean; currentPlan: string; hasCustomer: boolean }) {
  const [pending, setPending] = useState<string>();
  const [error, setError] = useState<string>();

  async function checkout(plan: Plan) {
    setPending(plan); setError(undefined);
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Le paiement n’est pas disponible.");
      window.location.assign(payload.url);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Le paiement n’est pas disponible."); setPending(undefined); }
  }

  async function portal() {
    setPending("portal"); setError(undefined);
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Le portail de facturation n’est pas disponible.");
      window.location.assign(payload.url);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Le portail de facturation n’est pas disponible."); setPending(undefined); }
  }

  const plans: Array<{ code: Plan; label: string; description: string }> = [
    { code: "starter", label: "Starter", description: "Pour démarrer un portefeuille conformité structuré." },
    { code: "pro", label: "Pro", description: "Pour les équipes qui gèrent plusieurs produits et fournisseurs." },
    { code: "business", label: "Business", description: "Pour les organisations avec besoins avancés et collaboration étendue." },
  ];

  return <div className="professional-stack">
    {!enabled ? <div className="inline-message inline-message-error"><CreditCard size={17}/><span><strong>Abonnements non ouverts.</strong> L’identité légale et le compte Stripe UE Conformité doivent être validés avant tout paiement.</span></div> : null}
    <section className="professional-summary-grid">{plans.map((plan) => <article key={plan.code}><span>{plan.label}</span><strong>{currentPlan === plan.code ? "Actuel" : "—"}</strong><small>{plan.description}</small><button className="button button-primary button-small" disabled={!enabled || Boolean(pending) || currentPlan === plan.code} onClick={() => void checkout(plan.code)}>{pending === plan.code ? "Ouverture…" : "Choisir"}<ArrowRight size={15}/></button></article>)}</section>
    {hasCustomer ? <button className="button button-secondary" disabled={!enabled || Boolean(pending)} onClick={() => void portal()}><ExternalLink size={16}/>{pending === "portal" ? "Ouverture…" : "Gérer l’abonnement sur Stripe"}</button> : null}
    {error ? <p className="form-feedback form-feedback-error" role="alert">{error}</p> : null}
  </div>;
}
