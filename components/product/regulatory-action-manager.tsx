"use client";

import { CalendarClock, CheckCircle2, ExternalLink, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { StoredRegulatoryAction } from "@/lib/data/regulatory-phase3";
import type { TeamMember } from "@/lib/types";

type Props = {
  organizationId: string;
  productId: string;
  actions: StoredRegulatoryAction[];
  members: TeamMember[];
};

const statusLabel = {
  open: "Ouverte",
  in_progress: "En cours",
  done: "Terminée",
  dismissed: "Écartée avec justification interne",
} as const;

const severityLabel = {
  medium: "À compléter",
  high: "À valider",
  blocking: "Bloquante",
} as const;

export function RegulatoryActionManager({ organizationId, productId, actions, members }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string>();
  const [error, setError] = useState<string>();

  async function updateAction(id: string, patch: { status?: string; assignee_id?: string | null; due_date?: string | null }) {
    setPendingId(id);
    setError(undefined);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.from("regulatory_action_items")
        .update(patch)
        .eq("id", id)
        .eq("org_id", organizationId)
        .eq("product_id", productId);
      if (updateError) throw updateError;
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de mettre à jour l’action.");
    } finally {
      setPendingId(undefined);
    }
  }

  if (!actions.length) return null;

  return <section className="panel professional-list-panel">
    <div className="professional-panel-heading compact"><div><span className="eyebrow">Collaboration</span><h2>Actions réglementaires enregistrées</h2><p>Assignez les revues et conservez leur état séparément de la décision d’applicabilité.</p></div><span className="professional-count">{actions.length}</span></div>
    {error ? <p className="form-feedback form-feedback-error" role="alert">{error}</p> : null}
    <div className="incident-list">
      {actions.map((action) => <article className="professional-row" key={action.id}>
        <div>
          <span className={`professional-status status-${action.status === "done" || action.status === "dismissed" ? "closed" : action.severity === "blocking" ? "open" : "pending"}`}>{severityLabel[action.severity]} · {statusLabel[action.status]}</span>
          <h3>{action.title}</h3>
          <a className="inline-link" href={action.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/>{action.regulationCode} · {action.sourceReference}</a>
        </div>
        <div className="professional-row-actions">
          <label className="field"><span><UserRound size={14}/> Responsable</span><select disabled={pendingId === action.id} value={action.assigneeId ?? ""} onChange={(event) => void updateAction(action.id, { assignee_id: event.target.value || null })}><option value="">Non assigné</option>{members.filter((member) => member.status === "active").map((member) => <option value={member.userId} key={member.userId}>{member.fullName}</option>)}</select></label>
          <label className="field"><span><CalendarClock size={14}/> Échéance</span><input disabled={pendingId === action.id} type="date" value={action.dueDate ?? ""} onChange={(event) => void updateAction(action.id, { due_date: event.target.value || null })}/></label>
          <label className="field"><span><CheckCircle2 size={14}/> Statut</span><select disabled={pendingId === action.id} value={action.status} onChange={(event) => void updateAction(action.id, { status: event.target.value })}><option value="open">Ouverte</option><option value="in_progress">En cours</option><option value="done">Terminée</option><option value="dismissed">Écartée</option></select></label>
        </div>
      </article>)}
    </div>
    <p className="secure-note">« Terminée » signifie que l’action interne a été traitée. « Écartée » signifie qu’elle a été écartée par l’organisation. Aucun de ces statuts ne constitue une certification du produit.</p>
  </section>;
}
