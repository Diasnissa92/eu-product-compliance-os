"use client";

import { CheckCircle2, ExternalLink, Send, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SupplierPortalForm({ token, supplierName, supplierEmail }: { token: string; supplierName: string; supplierEmail: string }) {
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    try {
      const { error: rpcError } = await createClient().rpc("submit_supplier_response", {
        p_token: token,
        p_supplier_name: String(form.get("supplierName") || ""),
        p_supplier_email: String(form.get("supplierEmail") || ""),
        p_document_name: String(form.get("documentName") || ""),
        p_document_url: String(form.get("documentUrl") || ""),
        p_notes: String(form.get("notes") || ""),
      });
      if (rpcError) throw rpcError;
      event.currentTarget.reset();
      setComplete(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "La réponse n’a pas pu être envoyée.");
    } finally {
      setSaving(false);
    }
  }

  if (complete) return <div className="portal-success"><CheckCircle2 size={38} /><h2>Document transmis</h2><p>L’équipe conformité a reçu cette pièce. Ajoutez un autre document si la demande en contient plusieurs.</p><button className="button button-secondary" type="button" onClick={() => setComplete(false)}><Send size={16} />Transmettre un autre document</button></div>;

  return <form className="portal-form form-grid" onSubmit={submit}>
    <label className="field"><span>Votre nom ou société</span><input name="supplierName" defaultValue={supplierName} required /></label>
    <label className="field"><span>Votre e-mail</span><input name="supplierEmail" type="email" defaultValue={supplierEmail} readOnly required /><small>Cette adresse est liée à la demande et ne peut pas être remplacée.</small></label>
    <label className="field field-full"><span>Nom du document</span><input name="documentName" required placeholder="Ex. Déclaration UE de conformité – modèle 2026" /></label>
    <label className="field field-full"><span>Lien HTTPS vers le document</span><div className="input-with-icon"><ExternalLink size={17} /><input name="documentUrl" type="url" pattern="https://.*" required placeholder="https://votre-espace-securise.eu/document.pdf" /></div><small>Utilisez un lien de partage protégé de votre espace documentaire.</small></label>
    <label className="field field-full"><span>Commentaire <em>optionnel</em></span><textarea name="notes" rows={4} placeholder="Précisez la version, le lot ou la période de validité." /></label>
    <div className="professional-form-actions field-full"><span className="secure-note"><ShieldCheck size={16} />Réponse liée uniquement à cette demande</span><button className="button button-primary" disabled={saving}><Send size={17} />{saving ? "Envoi…" : "Transmettre ce document"}</button></div>
    {error ? <p className="form-feedback form-feedback-error field-full" role="alert">{error}</p> : null}
  </form>;
}
