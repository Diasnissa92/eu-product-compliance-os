"use client";

import { CheckCircle2, Clipboard, ExternalLink, Link2, MailPlus, Send, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { copyText } from "@/lib/client-actions";
import type { ProfessionalProduct, SupplierRequestRecord, SupplierResponseRecord } from "@/lib/professional";
import { createClient } from "@/lib/supabase/client";

type Persistence = { organizationId: string; userId: string };

const statusCopy: Record<string, string> = {
  sent: "Envoyée",
  viewed: "Consultée",
  received: "Réponse reçue",
  completed: "Clôturée",
  expired: "Expirée",
  cancelled: "Annulée",
};

export function SupplierRequestManager({
  products,
  requests: initialRequests,
  responses,
  persistence,
}: {
  products: ProfessionalProduct[];
  requests: SupplierRequestRecord[];
  responses: SupplierResponseRecord[];
  persistence?: Persistence;
}) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string>();
  const [error, setError] = useState<string>();
  const openCount = requests.filter((request) => !["completed", "cancelled", "expired"].includes(request.status)).length;
  const responsesByRequest = useMemo(() => {
    const grouped = new Map<string, SupplierResponseRecord[]>();
    responses.forEach((response) => grouped.set(response.requestId, [...(grouped.get(response.requestId) || []), response]));
    return grouped;
  }, [responses]);

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    setFeedback(undefined);
    const form = new FormData(event.currentTarget);
    const productId = String(form.get("productId") || "");
    const supplierName = String(form.get("supplierName") || "").trim();
    const supplierEmail = String(form.get("supplierEmail") || "").trim();
    const subject = String(form.get("subject") || "").trim();
    const requestedItems = String(form.get("requestedItems") || "").split(/[\n,;]/).map((item) => item.trim()).filter(Boolean);
    const dueDate = String(form.get("dueDate") || "") || undefined;
    const message = String(form.get("message") || "").trim() || undefined;

    try {
      if (!productId || !supplierName || !supplierEmail || !subject || requestedItems.length === 0) throw new Error("Complétez le produit, le fournisseur, l’objet et au moins une pièce demandée.");
      let request: SupplierRequestRecord;
      if (persistence) {
        const supabase = createClient();
        const { data, error: insertError } = await supabase.from("supplier_requests").insert({
          org_id: persistence.organizationId,
          product_id: productId,
          created_by: persistence.userId,
          supplier_name: supplierName,
          supplier_email: supplierEmail,
          subject,
          requested_items: requestedItems,
          due_date: dueDate,
          message,
          status: "sent",
        }).select("id, product_id, supplier_name, supplier_email, subject, requested_items, message, due_date, status, access_token, submitted_at, created_at").single();
        if (insertError || !data) throw new Error(insertError?.message || "La demande n’a pas pu être créée.");
        request = {
          id: data.id, productId: data.product_id, supplierName: data.supplier_name,
          supplierEmail: data.supplier_email, subject: data.subject, requestedItems: data.requested_items,
          message: data.message ?? undefined, dueDate: data.due_date ?? undefined, status: data.status,
          accessToken: data.access_token, submittedAt: data.submitted_at ?? undefined, createdAt: data.created_at,
        };
      } else {
        request = {
          id: crypto.randomUUID(), productId, supplierName, supplierEmail, subject, requestedItems,
          message, dueDate, status: "sent", accessToken: crypto.randomUUID(), createdAt: new Date().toISOString(),
        };
      }
      setRequests((current) => [request, ...current]);
      const shareUrl = `${window.location.origin}/supplier/${request.accessToken}`;
      await copyText(shareUrl);
      setFeedback("Demande créée : le lien fournisseur sécurisé est copié.");
      event.currentTarget.reset();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "La demande n’a pas pu être créée.");
    } finally {
      setSaving(false);
    }
  }

  async function copyPortalLink(token: string) {
    await copyText(`${window.location.origin}/supplier/${token}`);
    setFeedback("Lien fournisseur copié. Vous pouvez l’envoyer par e-mail ou messagerie.");
  }

  async function completeRequest(requestId: string) {
    setError(undefined);
    try {
      if (persistence) {
        const { error: updateError } = await createClient().from("supplier_requests").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", requestId).eq("org_id", persistence.organizationId);
        if (updateError) throw updateError;
      }
      setRequests((current) => current.map((request) => request.id === requestId ? { ...request, status: "completed" } : request));
      setFeedback("Demande clôturée et conservée dans l’historique.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Mise à jour impossible.");
    }
  }

  return (
    <div className="professional-stack">
      <section className="professional-summary-grid" aria-label="Résumé fournisseurs">
        <article><span>Demandes ouvertes</span><strong>{openCount}</strong><small>Pièces en attente</small></article>
        <article><span>Réponses reçues</span><strong>{responses.length}</strong><small>À examiner</small></article>
        <article><span>Produits couverts</span><strong>{new Set(requests.map((item) => item.productId)).size}</strong><small>Portefeuille sollicité</small></article>
      </section>

      <section className="panel professional-form-panel">
        <div className="professional-panel-heading"><span className="feature-icon feature-icon-rose"><MailPlus size={20} /></span><div><span className="eyebrow">Collecte externe</span><h2>Demander une preuve à un fournisseur</h2><p>Créez un lien individuel : le fournisseur ne voit ni votre portefeuille ni vos données internes.</p></div></div>
        <form className="professional-form form-grid" onSubmit={createRequest}>
          <label className="field"><span>Produit</span><select name="productId" required defaultValue=""><option value="">Sélectionner</option>{products.map((product) => <option value={product.id} key={product.id}>{product.name} · {product.sku}</option>)}</select></label>
          <label className="field"><span>Nom du fournisseur</span><input name="supplierName" required placeholder="Ex. Laboratoire ACME" /></label>
          <label className="field"><span>E-mail du contact</span><input name="supplierEmail" type="email" required placeholder="qualite@fournisseur.eu" /></label>
          <label className="field"><span>Date attendue</span><input name="dueDate" type="date" min={new Date().toISOString().slice(0, 10)} /></label>
          <label className="field field-full"><span>Objet de la demande</span><input name="subject" required placeholder="Documents de conformité requis" /></label>
          <label className="field field-full"><span>Pièces demandées <em>une par ligne ou séparées par des virgules</em></span><textarea name="requestedItems" rows={3} required placeholder="Déclaration UE de conformité&#10;Rapport d’essais&#10;Notice en français" /></label>
          <label className="field field-full"><span>Message <em>optionnel</em></span><textarea name="message" rows={3} placeholder="Précisez le modèle, le lot ou le contexte de la demande." /></label>
          <div className="professional-form-actions field-full"><span className="secure-note"><ShieldCheck size={16} />Lien opaque et réponse traçable</span><button className="button button-primary" disabled={saving || products.length === 0}><Send size={17} />{saving ? "Création…" : "Créer et copier le lien"}</button></div>
          {feedback ? <p className="form-feedback form-feedback-success field-full" role="status">{feedback}</p> : null}
          {error ? <p className="form-feedback form-feedback-error field-full" role="alert">{error}</p> : null}
        </form>
      </section>

      <section className="panel professional-list-panel">
        <div className="professional-panel-heading compact"><div><span className="eyebrow">Suivi</span><h2>Demandes fournisseurs</h2></div><span className="professional-count">{requests.length}</span></div>
        {requests.length ? <div className="professional-list">{requests.map((request) => {
          const product = products.find((item) => item.id === request.productId);
          const requestResponses = responsesByRequest.get(request.id) || [];
          return <article className="professional-row" key={request.id}>
            <span className={`professional-status status-${request.status}`}>{statusCopy[request.status] || request.status}</span>
            <div className="professional-row-copy"><strong>{request.subject}</strong><p>{request.supplierName} · {request.supplierEmail}</p><small>{product?.name || "Produit"}{request.dueDate ? ` · attendu le ${new Intl.DateTimeFormat("fr-FR").format(new Date(request.dueDate))}` : ""}{requestResponses.length ? ` · ${requestResponses.length} document${requestResponses.length > 1 ? "s" : ""}` : ""}</small>{requestResponses.map((response) => <a className="inline-link" href={response.documentUrl} target="_blank" rel="noreferrer" key={response.id}><ExternalLink size={14} />{response.documentName}</a>)}</div>
            <div className="professional-row-actions"><button className="button button-secondary button-small" type="button" onClick={() => copyPortalLink(request.accessToken)}><Clipboard size={15} />Copier le lien</button>{requestResponses.length > 0 && request.status !== "completed" ? <button className="button button-primary button-small" type="button" onClick={() => completeRequest(request.id)}><CheckCircle2 size={15} />Clôturer</button> : null}</div>
          </article>;
        })}</div> : <div className="empty-state"><Link2 size={29} /><strong>Aucune demande</strong><p>Créez votre premier lien de collecte documentaire sécurisé.</p></div>}
      </section>
    </div>
  );
}
