"use client";

import { AlertCircle, CalendarDays, FileText, Landmark, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PortfolioDocument } from "@/lib/types";

const documentTypes = [
  "Déclaration de conformité",
  "Rapport de laboratoire",
  "Certificat",
  "Notice",
  "Déclaration matière",
  "Photo / étiquette",
  "Autre",
];

function formatDate(value?: string) {
  if (!value) return undefined;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function DocumentMetadataDialog({
  document,
  onClose,
  onSaved,
}: {
  document: PortfolioDocument;
  onClose: () => void;
  onSaved: (document: PortfolioDocument) => void;
}) {
  const [documentType, setDocumentType] = useState(document.type);
  const [issuingBody, setIssuingBody] = useState(document.issuingBody ?? "");
  const [issueDate, setIssueDate] = useState(document.issueOn ?? "");
  const [expiryDate, setExpiryDate] = useState(document.expiresOn ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    const updatedDocument: PortfolioDocument = {
      ...document,
      type: documentType,
      issuingBody: issuingBody.trim() || undefined,
      issueOn: issueDate || undefined,
      issueDate: formatDate(issueDate),
      expiresOn: expiryDate || undefined,
      expiresAt: formatDate(expiryDate),
    };

    if (!document.organizationId) {
      onSaved(updatedDocument);
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError("Votre session a expiré. Reconnectez-vous avant d’enregistrer.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("documents")
      .update({
        document_type: documentType,
        issuing_body: issuingBody.trim() || null,
        issue_date: issueDate || null,
        expiry_date: expiryDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", document.id)
      .eq("product_id", document.productId)
      .eq("org_id", document.organizationId);

    if (updateError) {
      setError(`Les informations n’ont pas pu être enregistrées : ${updateError.message}`);
      setSaving(false);
      return;
    }

    await supabase.from("audit_events").insert({
      org_id: document.organizationId,
      user_id: user.id,
      entity_type: "document",
      entity_id: document.productId,
      action: "Métadonnées documentaires mises à jour",
      payload: {
        document_id: document.id,
        document_type: documentType,
        issue_date: issueDate || null,
        expiry_date: expiryDate || null,
      },
    });

    onSaved(updatedDocument);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section className="metadata-dialog" role="dialog" aria-modal="true" aria-labelledby="metadata-dialog-title">
        <div className="metadata-dialog-heading">
          <div>
            <span className="eyebrow">Fiche documentaire</span>
            <h2 id="metadata-dialog-title">Qualifier la preuve</h2>
            <p>{document.name} · {document.productName}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={saving} aria-label="Fermer">
            <X size={19} />
          </button>
        </div>

        <form className="metadata-form" onSubmit={handleSubmit}>
          <label className="field field-full">
            <span><FileText size={15} />Type de document</span>
            <select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
              {documentTypes.includes(documentType) ? null : <option value={documentType}>{documentType}</option>}
              {documentTypes.map((type) => <option value={type} key={type}>{type}</option>)}
            </select>
          </label>

          <label className="field field-full">
            <span><Landmark size={15} />Organisme émetteur <em>facultatif</em></span>
            <input value={issuingBody} onChange={(event) => setIssuingBody(event.target.value)} placeholder="Ex. Laboratoire, organisme notifié, fabricant…" />
          </label>

          <div className="metadata-date-grid">
            <label className="field">
              <span><CalendarDays size={15} />Date d’émission</span>
              <input type="date" value={issueDate} max={expiryDate || undefined} onChange={(event) => setIssueDate(event.target.value)} />
            </label>
            <label className="field">
              <span><CalendarDays size={15} />Date d’expiration</span>
              <input type="date" value={expiryDate} min={issueDate || undefined} onChange={(event) => setExpiryDate(event.target.value)} />
            </label>
          </div>

          {error ? <div className="inline-message inline-message-error metadata-error" role="alert"><AlertCircle size={16} />{error}</div> : null}

          <div className="metadata-dialog-actions">
            <button className="button button-secondary" type="button" onClick={onClose} disabled={saving}>Annuler</button>
            <button className="button button-primary" type="submit" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
