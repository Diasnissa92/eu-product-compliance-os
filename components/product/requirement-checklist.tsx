"use client";

import { AlertCircle, AlertTriangle, Check, CheckCircle2, ChevronDown, CircleDashed, FileSearch, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { requirementStatusCopy } from "@/lib/status";
import { createClient } from "@/lib/supabase/client";
import type { PersistenceContext, ProductDocument, Requirement, RequirementStatus } from "@/lib/types";

const statusIcon: Record<RequirementStatus, typeof Check> = {
  verified: Check,
  pending: FileSearch,
  missing: CircleDashed,
  rejected: X,
  "not-applicable": Check,
};

type RequirementChecklistProps = {
  requirements: Requirement[];
  documents: ProductDocument[];
  persistence?: PersistenceContext;
};

export function RequirementChecklist({ requirements, documents, persistence }: RequirementChecklistProps) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(requirements[0]?.id ?? null);
  const [localRequirements, setLocalRequirements] = useState(requirements);
  const [selectedDocuments, setSelectedDocuments] = useState<Record<string, string>>(() =>
    Object.fromEntries(requirements.map((requirement) => [requirement.id, requirement.evidenceDocumentId ?? ""])),
  );
  const [reviewingId, setReviewingId] = useState<string>();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const availableDocuments = documents.filter((document) => document.status !== "expired");

  async function reviewRequirement(requirement: Requirement, decision: "approved" | "rejected") {
    const documentId = selectedDocuments[requirement.id];
    if (!documentId) {
      setMessage(null);
      setError("Choisissez d’abord une preuve documentaire.");
      return;
    }

    setReviewingId(requirement.id);
    setMessage(null);
    setError(null);
    const document = documents.find((item) => item.id === documentId);

    if (!persistence) {
      setLocalRequirements((current) => current.map((item) => item.id === requirement.id
        ? {
            ...item,
            status: decision === "approved" ? "verified" : "rejected",
            evidenceDocumentId: documentId,
            evidenceDocumentName: document?.name,
          }
        : item));
      setMessage(decision === "approved" ? "La preuve est validée en mode démonstration." : "La preuve est refusée en mode démonstration.");
      setReviewingId(undefined);
      return;
    }

    const { error: reviewError } = await createClient().rpc("review_product_requirement", {
      p_product_requirement_id: requirement.id,
      p_document_id: documentId,
      p_decision: decision,
    });

    if (reviewError) {
      setError(`La décision n’a pas pu être enregistrée : ${reviewError.message}`);
      setReviewingId(undefined);
      return;
    }

    setLocalRequirements((current) => current.map((item) => item.id === requirement.id
      ? {
          ...item,
          status: decision === "approved" ? "verified" : "rejected",
          evidenceDocumentId: documentId,
          evidenceDocumentName: document?.name,
        }
      : item));
    setMessage(decision === "approved"
      ? "Preuve validée. Le score du dossier a été recalculé."
      : "Preuve refusée. Le risque du dossier a été actualisé.");
    setReviewingId(undefined);
    router.refresh();
  }

  return (
    <div>
      {message ? <div className="inline-message" aria-live="polite"><CheckCircle2 size={16} />{message}</div> : null}
      {error ? <div className="inline-message inline-message-error" role="alert"><AlertCircle size={16} />{error}</div> : null}
      <div className="requirements-list">
        {localRequirements.map((requirement) => {
          const Icon = statusIcon[requirement.status];
          const open = openId === requirement.id;
          return (
            <article className={`requirement-item requirement-${requirement.status}`} key={requirement.id}>
              <button
                type="button"
                className="requirement-summary"
                onClick={() => setOpenId(open ? null : requirement.id)}
                aria-expanded={open}
              >
                <span className="requirement-status-icon"><Icon size={17} /></span>
                <span className="requirement-main">
                  <strong>{requirement.title}</strong>
                  <small>{requirement.regulation}</small>
                </span>
                {requirement.severity === "blocking" ? (
                  <span className="severity-badge"><AlertTriangle size={12} />Essentiel</span>
                ) : null}
                <span className={`requirement-state state-${requirement.status}`}>
                  {requirementStatusCopy[requirement.status]}
                </span>
                <ChevronDown className={open ? "chevron-open" : ""} size={17} />
              </button>
              {open ? (
                <div className="requirement-detail">
                  <p>{requirement.description}</p>
                  <dl>
                    <div><dt>Responsable</dt><dd>{requirement.owner ?? "Non assigné"}</dd></div>
                    <div><dt>Échéance</dt><dd>{requirement.dueDate ?? "Aucune échéance"}</dd></div>
                    <div><dt>Niveau</dt><dd>{requirement.severity === "blocking" ? "Bloquant" : requirement.severity}</dd></div>
                  </dl>
                  {requirement.evidenceDocumentName ? (
                    <p className="linked-evidence"><CheckCircle2 size={14} />Preuve liée : <strong>{requirement.evidenceDocumentName}</strong></p>
                  ) : null}
                  {availableDocuments.length ? (
                    <div className="requirement-review-controls">
                      <label>
                        <span>Preuve à examiner</span>
                        <select
                          value={selectedDocuments[requirement.id] ?? ""}
                          disabled={reviewingId === requirement.id}
                          onChange={(event) => setSelectedDocuments((current) => ({ ...current, [requirement.id]: event.target.value }))}
                        >
                          <option value="">Choisir un document</option>
                          {availableDocuments.map((document) => (
                            <option key={document.id} value={document.id}>{document.name}</option>
                          ))}
                        </select>
                      </label>
                      <button
                        className="button button-primary button-small"
                        type="button"
                        disabled={reviewingId === requirement.id}
                        onClick={() => void reviewRequirement(requirement, "approved")}
                      >
                        <Check size={15} />{reviewingId === requirement.id ? "Enregistrement…" : "Valider la preuve"}
                      </button>
                      <button
                        className="button button-danger button-small"
                        type="button"
                        disabled={reviewingId === requirement.id}
                        onClick={() => void reviewRequirement(requirement, "rejected")}
                      >
                        <X size={15} />Refuser
                      </button>
                    </div>
                  ) : (
                    <a className="button button-secondary button-small" href="#documents">Ajouter d’abord une preuve</a>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
