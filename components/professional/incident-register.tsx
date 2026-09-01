"use client";

import { AlertOctagon, CalendarCheck2, CheckCircle2, ClipboardCheck, ExternalLink, Plus, RotateCcw, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { CorrectiveActionRecord, IncidentRecord, ProfessionalProduct } from "@/lib/professional";
import { createClient } from "@/lib/supabase/client";

type Persistence = { organizationId: string; userId: string };
const incidentStatus: Record<string, string> = { open: "Ouvert", investigating: "Enquête", action_required: "Actions requises", recall: "Rappel", closed: "Clôturé" };
const safetyBusinessGatewayUrl = "https://webgate.ec.europa.eu/safety-business-gateway/";

export function IncidentRegister({ products, incidents: initialIncidents, actions: initialActions, persistence }: { products: ProfessionalProduct[]; incidents: IncidentRecord[]; actions: CorrectiveActionRecord[]; persistence?: Persistence }) {
  const router = useRouter();
  const [incidents, setIncidents] = useState(initialIncidents);
  const [actions, setActions] = useState(initialActions);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string>();
  const [error, setError] = useState<string>();
  const active = incidents.filter((incident) => incident.status !== "closed");

  async function createIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(undefined); setFeedback(undefined);
    const form = new FormData(event.currentTarget);
    const productId = String(form.get("productId") || "") || undefined;
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim();
    const severity = String(form.get("severity") || "medium");
    const source = String(form.get("source") || "internal");
    const occurredAt = String(form.get("occurredAt") || "") || undefined;
    const affectedUnitsValue = String(form.get("affectedUnits") || "");
    const affectedUnits = affectedUnitsValue ? Number(affectedUnitsValue) : undefined;
    const countries = String(form.get("countries") || "").split(/[,;]/).map((item) => item.trim()).filter(Boolean);
    const recallRequired = form.get("recallRequired") === "on";
    try {
      if (title.length < 3 || title.length > 240 || description.length < 3 || description.length > 6000) throw new Error("Le titre doit contenir 3 à 240 caractères et la description 3 à 6 000 caractères.");
      if (!['low', 'medium', 'high', 'critical'].includes(severity) || !['internal', 'customer', 'authority', 'safety_gate', 'supplier'].includes(source)) throw new Error("Gravité ou source invalide.");
      if (countries.length > 30 || countries.some((country) => country.length > 120)) throw new Error("Limitez les pays concernés à 30 valeurs de 120 caractères maximum.");
      if (affectedUnits !== undefined && (!Number.isSafeInteger(affectedUnits) || affectedUnits < 0)) throw new Error("Le nombre d’unités touchées doit être un entier positif ou nul.");
      let incident: IncidentRecord = { id: crypto.randomUUID(), productId, title, source, severity, status: recallRequired ? "recall" : "open", description, countries, affectedUnits, recallRequired, occurredAt, detectedAt: new Date().toISOString() };
      if (persistence) {
        const { data, error: insertError } = await createClient().from("product_incidents").insert({ org_id: persistence.organizationId, product_id: productId, created_by: persistence.userId, title, source, severity, status: incident.status, description, countries, affected_units: affectedUnits, recall_required: recallRequired, occurred_at: occurredAt }).select("id, detected_at").single();
        if (insertError || !data) throw new Error(insertError?.message || "L’incident n’a pas pu être créé.");
        incident = { ...incident, id: data.id, detectedAt: data.detected_at };
      }
      setIncidents((current) => [incident, ...current]); event.currentTarget.reset();
      setFeedback(recallRequired || ["high", "critical"].includes(severity)
        ? "Incident enregistré. Évaluez sans délai les mesures correctives et les éventuelles obligations de notification externe ; UE Conformité n’envoie aucune déclaration aux autorités à votre place."
        : "Incident enregistré. Ajoutez les actions correctives nécessaires et évaluez les obligations de notification applicables.");
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Création impossible."); }
    finally { setSaving(false); }
  }

  async function updateIncident(incident: IncidentRecord, status: string) {
    setSaving(true); setError(undefined);
    try {
      if (!["open", "investigating", "action_required", "recall", "closed"].includes(status)) throw new Error("Statut invalide.");
      const incidentActions = actions.filter((action) => action.incidentId === incident.id);
      if (status === "closed" && incidentActions.some((action) => !["done", "cancelled"].includes(action.status))) {
        throw new Error("Terminez ou annulez toutes les actions correctives avant de clôturer l’incident.");
      }
      if (status === "closed" && (incident.recallRequired || ["high", "critical"].includes(incident.severity)) && !incidentActions.some((action) => action.status === "done")) {
        throw new Error("Au moins une action corrective terminée est requise avant de clôturer un incident élevé, critique ou avec rappel.");
      }
      const update = { status, recall_required: status === "recall" ? true : incident.recallRequired, closed_at: status === "closed" ? new Date().toISOString() : null, updated_at: new Date().toISOString() };
      if (persistence) { const { error: updateError } = await createClient().from("product_incidents").update(update).eq("id", incident.id).eq("org_id", persistence.organizationId); if (updateError) throw updateError; }
      setIncidents((current) => current.map((item) => item.id === incident.id ? { ...item, status, recallRequired: update.recall_required } : item)); setFeedback("Statut de l’incident mis à jour."); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Mise à jour impossible."); }
    finally { setSaving(false); }
  }

  async function addAction(event: FormEvent<HTMLFormElement>, incidentId: string) {
    event.preventDefault(); setSaving(true); setError(undefined);
    const form = new FormData(event.currentTarget); const title = String(form.get("title") || "").trim(); const priority = String(form.get("priority") || "normal"); const dueDate = String(form.get("dueDate") || "") || undefined;
    try {
      if (title.length < 3 || title.length > 240) throw new Error("L’action corrective doit contenir 3 à 240 caractères.");
      if (!["normal", "high", "urgent"].includes(priority)) throw new Error("Priorité invalide.");
      let action: CorrectiveActionRecord = { id: crypto.randomUUID(), incidentId, title, priority, status: "todo", dueDate };
      if (persistence) { const { data, error: insertError } = await createClient().from("corrective_actions").insert({ org_id: persistence.organizationId, incident_id: incidentId, created_by: persistence.userId, title, priority, due_date: dueDate, status: "todo" }).select("id").single(); if (insertError || !data) throw new Error(insertError?.message || "L’action n’a pas pu être créée."); action = { ...action, id: data.id }; }
      setActions((current) => [...current, action]); event.currentTarget.reset(); setFeedback("Action corrective ajoutée."); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Création impossible."); }
    finally { setSaving(false); }
  }

  async function toggleAction(action: CorrectiveActionRecord) {
    const done = action.status !== "done"; const update = { status: done ? "done" : "todo", completed_at: done ? new Date().toISOString() : null, updated_at: new Date().toISOString() };
    if (persistence) { const { error: updateError } = await createClient().from("corrective_actions").update(update).eq("id", action.id).eq("org_id", persistence.organizationId); if (updateError) { setError(updateError.message); return; } }
    setActions((current) => current.map((item) => item.id === action.id ? { ...item, status: done ? "done" : "todo" } : item)); setFeedback(done ? "Action terminée." : "Action rouverte."); router.refresh();
  }

  return <div className="professional-stack">
    <section className="professional-summary-grid"><article><span>Incidents ouverts</span><strong>{active.length}</strong><small>À piloter</small></article><article><span>Rappels</span><strong>{active.filter((item) => item.recallRequired).length}</strong><small>Procédures internes actives</small></article><article><span>Actions restantes</span><strong>{actions.filter((item) => item.status !== "done" && active.some((incident) => incident.id === item.incidentId)).length}</strong><small>Plan correctif</small></article></section>
    <section className="panel professional-form-panel"><div className="professional-panel-heading"><span className="feature-icon feature-icon-red"><ShieldAlert size={21} /></span><div><span className="eyebrow">Registre interne ≠ déclaration officielle</span><h2>Notification externe à vérifier séparément</h2><p>Ce registre documente votre traitement interne. Il ne transmet aucune notification aux autorités. Pour un produit dangereux ou certains accidents, le GPSR peut imposer une notification via le Safety Business Gateway de la Commission européenne, sans retard injustifié selon le cas.</p><a className="inline-link" href={safetyBusinessGatewayUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} />Ouvrir le Safety Business Gateway officiel</a></div></div></section>
    <section className="panel professional-form-panel"><div className="professional-panel-heading"><span className="feature-icon feature-icon-red"><AlertOctagon size={21} /></span><div><span className="eyebrow">Signalement traçable</span><h2>Ouvrir un incident produit</h2><p>Centralisez le fait déclencheur, le risque, les marchés concernés et votre décision interne de rappel.</p></div></div><form className="professional-form form-grid" onSubmit={createIncident}><label className="field"><span>Produit</span><select name="productId" defaultValue=""><option value="">Produit non identifié</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</select></label><label className="field"><span>Source</span><select name="source" defaultValue="internal"><option value="internal">Contrôle interne</option><option value="customer">Client</option><option value="authority">Autorité</option><option value="safety_gate">Safety Gate</option><option value="supplier">Fournisseur</option></select></label><label className="field field-full"><span>Titre</span><input name="title" required minLength={3} maxLength={240} placeholder="Ex. Surchauffe signalée sur le lot 2026-04" /></label><label className="field"><span>Gravité</span><select name="severity" defaultValue="medium"><option value="low">Faible</option><option value="medium">Modérée</option><option value="high">Élevée</option><option value="critical">Critique</option></select></label><label className="field"><span>Date du fait</span><input name="occurredAt" type="date" max={new Date().toISOString().slice(0, 10)} /></label><label className="field"><span>Pays concernés</span><input name="countries" maxLength={5000} placeholder="France, Belgique" /></label><label className="field"><span>Unités potentiellement touchées</span><input name="affectedUnits" type="number" min="0" step="1" /></label><label className="field field-full"><span>Description factuelle</span><textarea name="description" rows={4} required minLength={3} maxLength={6000} placeholder="Décrivez les faits observés, sans conclusion non vérifiée." /></label><label className="check-card field-full"><input name="recallRequired" type="checkbox" /><span><strong>Décision interne : une procédure de rappel est nécessaire</strong><small>Le dossier sera placé au statut Rappel. Cela ne vaut pas notification à une autorité ni publication d’un avis de rappel.</small></span></label><div className="professional-form-actions field-full"><a className="inline-link" href={safetyBusinessGatewayUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} />Portail officiel de notification</a><button className="button button-primary" disabled={saving}><Plus size={17} />Ouvrir l’incident</button></div>{feedback ? <p className="form-feedback form-feedback-success field-full" role="status">{feedback}</p> : null}{error ? <p className="form-feedback form-feedback-error field-full" role="alert">{error}</p> : null}</form></section>
    <div className="incident-list">{incidents.length ? incidents.map((incident) => { const product = products.find((item) => item.id === incident.productId); const incidentActions = actions.filter((action) => action.incidentId === incident.id); const completed = incidentActions.filter((action) => action.status === "done").length; const regulatoryReviewRecommended = incident.recallRequired || ["high", "critical"].includes(incident.severity); return <article className={`panel incident-card incident-${incident.severity}`} key={incident.id}><header><div><span className={`professional-status status-${incident.status}`}>{incidentStatus[incident.status] || incident.status}</span><h2>{incident.title}</h2><p>{product?.name || "Produit non identifié"}{incident.reference ? ` · ${incident.reference}` : ""}</p></div><label className="incident-status-control"><span>Statut interne</span><select value={incident.status} disabled={saving} onChange={(event) => updateIncident(incident, event.target.value)}><option value="open">Ouvert</option><option value="investigating">Enquête</option><option value="action_required">Actions requises</option><option value="recall">Rappel</option><option value="closed">Clôturé</option></select></label></header><div className="incident-details"><span><ShieldAlert size={16} />Gravité {incident.severity}</span><span><CalendarCheck2 size={16} />Détecté le {new Intl.DateTimeFormat("fr-FR").format(new Date(incident.detectedAt))}</span>{incident.recallRequired ? <span className="recall-flag"><RotateCcw size={16} />Rappel interne requis</span> : null}</div>{regulatoryReviewRecommended ? <p className="form-feedback form-feedback-error"><strong>Revue réglementaire externe requise.</strong> Vérifiez immédiatement si une notification Safety Business Gateway et/ou une information des consommateurs/autorités est obligatoire. <a className="inline-link" href={safetyBusinessGatewayUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} />Portail officiel</a></p> : null}<p className="incident-description">{incident.description}</p><section className="corrective-block"><div className="corrective-heading"><div><span className="eyebrow">Plan correctif</span><h3>Actions {completed}/{incidentActions.length}</h3></div></div>{incidentActions.length ? <div className="corrective-list">{incidentActions.map((action) => <button className={`corrective-action ${action.status === "done" ? "corrective-done" : ""}`} type="button" onClick={() => toggleAction(action)} key={action.id}>{action.status === "done" ? <CheckCircle2 size={18} /> : <ClipboardCheck size={18} />}<span><strong>{action.title}</strong><small>{action.priority}{action.dueDate ? ` · avant le ${new Intl.DateTimeFormat("fr-FR").format(new Date(action.dueDate))}` : ""}</small></span></button>)}</div> : <p className="empty-inline">Aucune action corrective définie.</p>}<form className="corrective-form" onSubmit={(event) => addAction(event, incident.id)}><input name="title" required minLength={3} maxLength={240} placeholder="Nouvelle action corrective…" /><select name="priority" defaultValue="normal"><option value="normal">Normale</option><option value="high">Haute</option><option value="urgent">Urgente</option></select><input name="dueDate" type="date" min={new Date().toISOString().slice(0, 10)} /><button className="button button-secondary button-small" disabled={saving}><Plus size={15} />Ajouter</button></form></section></article>; }) : <section className="panel empty-state"><AlertOctagon size={31} /><strong>Aucun incident enregistré</strong><p>Votre registre est prêt à documenter et piloter tout signalement sans confondre suivi interne et notification officielle.</p></section>}</div>
  </div>;
}
