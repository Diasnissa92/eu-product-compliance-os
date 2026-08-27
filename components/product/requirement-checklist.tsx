"use client";

import { AlertCircle, AlertTriangle, BookOpenCheck, CalendarClock, Check, CheckCircle2, ChevronDown, CircleDashed, ExternalLink, FileSearch, MessageSquareText, Save, Send, UserRoundCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { requirementStatusCopy } from "@/lib/status";
import { createClient } from "@/lib/supabase/client";
import type { PersistenceContext, ProductDocument, Requirement, RequirementComment, RequirementStatus, TeamMember } from "@/lib/types";

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
  collaboration: {
    members: TeamMember[];
    canAssign: boolean;
    canComment: boolean;
    currentUserId?: string;
    currentUserName: string;
    currentUserInitials: string;
  };
};

export function RequirementChecklist({ requirements, documents, persistence, collaboration }: RequirementChecklistProps) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(requirements[0]?.id ?? null);
  const [localRequirements, setLocalRequirements] = useState(requirements);
  const [selectedDocuments, setSelectedDocuments] = useState<Record<string, string>>(() =>
    Object.fromEntries(requirements.map((requirement) => [requirement.id, requirement.evidenceDocumentId ?? ""])),
  );
  const [assignees, setAssignees] = useState<Record<string, string>>(() =>
    Object.fromEntries(requirements.map((requirement) => [requirement.id, requirement.assigneeId ?? ""])),
  );
  const [dueDates, setDueDates] = useState<Record<string, string>>(() =>
    Object.fromEntries(requirements.map((requirement) => [requirement.id, requirement.dueDateValue ?? ""])),
  );
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState<string>();
  const [collaborationAction, setCollaborationAction] = useState<string>();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const availableDocuments = documents.filter((document) => document.status !== "expired");
  const activeMembers = collaboration.members.filter((member) => member.status === "active");

  function formatLocalDate(value: string) {
    return value
      ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`))
      : undefined;
  }

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

  async function saveAssignment(requirement: Requirement) {
    const assigneeId = assignees[requirement.id] || null;
    const dueDate = dueDates[requirement.id] || null;
    const assignee = collaboration.members.find((member) => member.userId === assigneeId);
    setCollaborationAction(`assignment:${requirement.id}`);
    setMessage(null);
    setError(null);

    if (persistence) {
      const { error: assignmentError } = await createClient().rpc("assign_product_requirement", {
        p_product_requirement_id: requirement.id,
        p_assignee_id: assigneeId,
        p_due_date: dueDate,
      });
      if (assignmentError) {
        setError(`L’affectation n’a pas pu être enregistrée : ${assignmentError.message}`);
        setCollaborationAction(undefined);
        return;
      }
    }

    setLocalRequirements((current) => current.map((item) => item.id === requirement.id ? {
      ...item,
      assigneeId: assigneeId ?? undefined,
      owner: assignee?.fullName,
      dueDate: dueDate ? formatLocalDate(dueDate) : undefined,
      dueDateValue: dueDate ?? undefined,
    } : item));
    setMessage("Responsabilité et échéance enregistrées.");
    setCollaborationAction(undefined);
    if (persistence) router.refresh();
  }

  async function addComment(requirement: Requirement) {
    const body = commentDrafts[requirement.id]?.trim();
    if (!body) return;
    setCollaborationAction(`comment:${requirement.id}`);
    setMessage(null);
    setError(null);

    let persistedId = `demo-comment-${Date.now()}`;
    if (persistence) {
      const { data, error: commentError } = await createClient().rpc("add_requirement_comment", {
        p_product_requirement_id: requirement.id,
        p_body: body,
      });
      if (commentError) {
        setError(`Le commentaire n’a pas pu être ajouté : ${commentError.message}`);
        setCollaborationAction(undefined);
        return;
      }
      if (data && typeof data === "object" && !Array.isArray(data) && typeof data.id === "string") persistedId = data.id;
    }

    const comment: RequirementComment = {
      id: persistedId,
      body,
      authorId: collaboration.currentUserId || "demo-current-user",
      authorName: collaboration.currentUserName,
      authorInitials: collaboration.currentUserInitials,
      createdAt: "À l’instant",
    };
    setLocalRequirements((current) => current.map((item) => item.id === requirement.id
      ? { ...item, comments: [...(item.comments ?? []), comment] }
      : item));
    setCommentDrafts((current) => ({ ...current, [requirement.id]: "" }));
    setMessage("Commentaire ajouté au journal de l’exigence.");
    setCollaborationAction(undefined);
    if (persistence) router.refresh();
  }

  return (
    <div>
      <div className="regulatory-trust-note">
        <span><BookOpenCheck size={18} /></span>
        <div>
          <strong>Diagnostic traçable</strong>
          <p>Chaque exigence indique son référentiel, sa justification et, lorsqu’elle est disponible, sa source officielle.</p>
        </div>
      </div>
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
                  <div className="requirement-source-card">
                    <div>
                      <span className="requirement-source-icon"><BookOpenCheck size={16} /></span>
                      <span>
                        <small>Référentiel officiel</small>
                        <strong>{requirement.regulationTitle ?? requirement.regulation}</strong>
                        <em>{requirement.sourceReference ? `${requirement.regulation} · ${requirement.sourceReference}` : requirement.regulation}</em>
                      </span>
                    </div>
                    {requirement.sourceUrl ? (
                      <a href={requirement.sourceUrl} target="_blank" rel="noreferrer">
                        Consulter la source <ExternalLink size={13} />
                      </a>
                    ) : <span className="source-unavailable">Source à compléter</span>}
                  </div>
                  <div className="requirement-applicability">
                    <div><small>Pourquoi cette règle s’applique</small><p>{requirement.applicableReason ?? "Règle sélectionnée à partir de la catégorie, du rôle opérateur et des marchés déclarés."}</p></div>
                    <div className="requirement-version">
                      {requirement.effectiveFrom ? <span>Applicable depuis <strong>{requirement.effectiveFrom}</strong></span> : null}
                      {requirement.lastUpdated ? <span>Référentiel vérifié le <strong>{requirement.lastUpdated}</strong></span> : null}
                    </div>
                  </div>
                  <div className="requirement-collaboration">
                    <div className="collaboration-heading">
                      <span><UserRoundCheck size={16} /></span>
                      <div><strong>Responsabilité et échanges</strong><small>{requirement.comments?.length ?? 0} commentaire{(requirement.comments?.length ?? 0) > 1 ? "s" : ""}</small></div>
                    </div>

                    {collaboration.canAssign ? (
                      <div className="assignment-controls">
                        <label>
                          <span>Responsable</span>
                          <select
                            value={assignees[requirement.id] ?? ""}
                            disabled={collaborationAction === `assignment:${requirement.id}`}
                            onChange={(event) => setAssignees((current) => ({ ...current, [requirement.id]: event.target.value }))}
                          >
                            <option value="">Non assigné</option>
                            {activeMembers.map((member) => <option key={member.userId} value={member.userId}>{member.fullName}</option>)}
                          </select>
                        </label>
                        <label>
                          <span><CalendarClock size={12} />Échéance interne</span>
                          <input
                            type="date"
                            value={dueDates[requirement.id] ?? ""}
                            disabled={collaborationAction === `assignment:${requirement.id}`}
                            onChange={(event) => setDueDates((current) => ({ ...current, [requirement.id]: event.target.value }))}
                          />
                        </label>
                        <button
                          className="button button-secondary button-small"
                          type="button"
                          disabled={collaborationAction === `assignment:${requirement.id}`}
                          onClick={() => void saveAssignment(requirement)}
                        >
                          <Save size={14} />{collaborationAction === `assignment:${requirement.id}` ? "Enregistrement…" : "Enregistrer"}
                        </button>
                      </div>
                    ) : null}

                    <div className="requirement-comments">
                      {(requirement.comments ?? []).length ? requirement.comments?.map((comment) => (
                        <article className="requirement-comment" key={comment.id}>
                          <span className="avatar comment-avatar">{comment.authorInitials}</span>
                          <div><strong>{comment.authorName}</strong><p>{comment.body}</p><small>{comment.createdAt}</small></div>
                        </article>
                      )) : <div className="comments-empty"><MessageSquareText size={16} /><span>Aucun échange pour cette exigence.</span></div>}
                    </div>

                    {collaboration.canComment ? (
                      <div className="comment-composer">
                        <label className="sr-only" htmlFor={`comment-${requirement.id}`}>Ajouter un commentaire</label>
                        <textarea
                          id={`comment-${requirement.id}`}
                          rows={2}
                          maxLength={2000}
                          value={commentDrafts[requirement.id] ?? ""}
                          placeholder="Ajouter une précision, une demande ou une décision…"
                          disabled={collaborationAction === `comment:${requirement.id}`}
                          onChange={(event) => setCommentDrafts((current) => ({ ...current, [requirement.id]: event.target.value }))}
                        />
                        <button
                          className="button button-dark button-small"
                          type="button"
                          disabled={!commentDrafts[requirement.id]?.trim() || collaborationAction === `comment:${requirement.id}`}
                          onClick={() => void addComment(requirement)}
                        >
                          <Send size={14} />{collaborationAction === `comment:${requirement.id}` ? "Envoi…" : "Commenter"}
                        </button>
                      </div>
                    ) : null}
                  </div>
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
