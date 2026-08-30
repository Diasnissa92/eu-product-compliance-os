import { CalendarClock, FileCheck2, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { SupplierPortalForm } from "@/components/professional/supplier-portal-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

type PortalRequest = { supplierName: string; supplierEmail: string; subject: string; requestedItems: string[]; message?: string; dueDate?: string; status: string; productName: string; productSku?: string; organizationName: string };

function portalRequest(value: Json): PortalRequest | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const request = value as Record<string, Json | undefined>;
  if (typeof request.subject !== "string" || typeof request.productName !== "string" || typeof request.organizationName !== "string") return undefined;
  return {
    supplierName: typeof request.supplierName === "string" ? request.supplierName : "Fournisseur",
    supplierEmail: typeof request.supplierEmail === "string" ? request.supplierEmail : "",
    subject: request.subject,
    requestedItems: Array.isArray(request.requestedItems) ? request.requestedItems.filter((item): item is string => typeof item === "string") : [],
    message: typeof request.message === "string" ? request.message : undefined,
    dueDate: typeof request.dueDate === "string" ? request.dueDate : undefined,
    status: typeof request.status === "string" ? request.status : "sent",
    productName: request.productName,
    productSku: typeof request.productSku === "string" ? request.productSku : undefined,
    organizationName: request.organizationName,
  };
}

export default async function SupplierPortalPage({ params }: { params: Promise<{ token: string }> }) {
  if (!isSupabaseConfigured) notFound();
  const { token } = await params;
  const { data, error } = await (await createClient()).rpc("get_supplier_request_portal", { p_token: token });
  const request = portalRequest(data);
  if (error || !request) notFound();
  return <main className="public-portal-page">
    <section className="public-portal-card">
      <header className="public-portal-header"><span className="brand-mark"><BrandMark size={28} /></span><div><span className="eyebrow">Portail documentaire sécurisé</span><strong>{request.organizationName}</strong></div><span className="portal-security"><ShieldCheck size={16} />Accès limité</span></header>
      <div className="public-portal-intro"><span className="feature-icon feature-icon-rose"><FileCheck2 size={23} /></span><div><span className="eyebrow">Demande fournisseur</span><h1>{request.subject}</h1><p>{request.productName}{request.productSku ? ` · ${request.productSku}` : ""}</p></div></div>
      {request.message ? <blockquote className="portal-message">{request.message}</blockquote> : null}
      <div className="portal-request-grid"><div><strong>Pièces demandées</strong><ul>{request.requestedItems.map((item) => <li key={item}><FileCheck2 size={15} />{item}</li>)}</ul></div><div><strong>Échéance</strong><p><CalendarClock size={16} />{request.dueDate ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(request.dueDate)) : "Dès que possible"}</p></div></div>
      <SupplierPortalForm token={token} supplierName={request.supplierName} supplierEmail={request.supplierEmail} />
    </section>
  </main>;
}

