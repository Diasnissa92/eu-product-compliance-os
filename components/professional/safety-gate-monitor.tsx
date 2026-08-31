"use client";

import { AlertTriangle, ExternalLink, Eye, Plus, Radar, RefreshCw, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { copyText } from "@/lib/client-actions";
import type { ProfessionalProduct, SafetyGateMatchRecord, SafetyGateWatchRecord } from "@/lib/professional";
import { createClient } from "@/lib/supabase/client";

type Persistence = { organizationId: string; userId: string };
const officialSafetyGateUrl = "https://ec.europa.eu/safety-gate-alerts/screen/webReport?lang=fr";
const officialAlertPattern = /^https:\/\/ec\.europa\.eu\/safety-gate-alerts\/screen\/webReport\/alertDetail\/\d+$/;

export function SafetyGateMonitor({ products, watches: initialWatches, matches: initialMatches, persistence }: { products: ProfessionalProduct[]; watches: SafetyGateWatchRecord[]; matches: SafetyGateMatchRecord[]; persistence?: Persistence }) {
  const router = useRouter();
  const [watches, setWatches] = useState(initialWatches);
  const [matches, setMatches] = useState(initialMatches);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string>();
  const [error, setError] = useState<string>();

  async function addWatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(undefined); setFeedback(undefined);
    const form = new FormData(event.currentTarget);
    const productId = String(form.get("productId") || "") || undefined;
    const label = String(form.get("label") || "").trim();
    const rawKeywords = String(form.get("keywords") || "").split(/[\n,;]/).map((item) => item.trim()).filter(Boolean);
    const category = String(form.get("category") || "").trim() || undefined;
    const keywords = [...new Map([...rawKeywords, ...(category ? [category] : [])].map((item) => [item.toLocaleLowerCase("fr"), item])).values()];
    try {
      if (!label || !keywords.length) throw new Error("Ajoutez un nom de veille et au moins un mot-clé.");
      if (keywords.length > 20 || keywords.some((item) => item.length < 3 || item.length > 120)) throw new Error("Utilisez 1 à 20 termes précis de 3 à 120 caractères.");
      let watch: SafetyGateWatchRecord = { id: crypto.randomUUID(), productId, label, keywords, category, enabled: true, lastResultCount: 0 };
      if (persistence) {
        const { data, error: insertError } = await createClient().from("safety_gate_watches").insert({ org_id: persistence.organizationId, product_id: productId, created_by: persistence.userId, label, keywords, category, enabled: true }).select("id").single();
        if (insertError || !data) throw new Error(insertError?.message || "La veille n’a pas pu être créée.");
        watch = { ...watch, id: data.id };
      }
      setWatches((current) => [watch, ...current]);
      event.currentTarget.reset();
      setFeedback("Veille enregistrée. Elle sera incluse dans la prochaine synchronisation quotidienne Safety Gate.");
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Création impossible."); }
    finally { setSaving(false); }
  }

  async function checkWatch(watch: SafetyGateWatchRecord) {
    const checkedAt = new Date().toISOString();
    await copyText(watch.keywords.join(" OR "));
    if (persistence) await createClient().from("safety_gate_watches").update({ last_checked_at: checkedAt, updated_at: checkedAt }).eq("id", watch.id).eq("org_id", persistence.organizationId);
    setWatches((current) => current.map((item) => item.id === watch.id ? { ...item, lastCheckedAt: checkedAt } : item));
    setFeedback("Mots-clés copiés. La recherche officielle Safety Gate s’ouvre dans un nouvel onglet.");
    window.open(officialSafetyGateUrl, "_blank", "noopener,noreferrer");
  }

  async function addMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(undefined); setFeedback(undefined);
    const form = new FormData(event.currentTarget);
    const watchId = String(form.get("watchId") || "") || undefined;
    const watch = watches.find((item) => item.id === watchId);
    const alertReference = String(form.get("alertReference") || "").trim();
    const title = String(form.get("title") || "").trim();
    const alertUrl = String(form.get("alertUrl") || "").trim();
    const riskLevel = String(form.get("riskLevel") || "serious");
    try {
      if (!alertReference || !title || !officialAlertPattern.test(alertUrl)) throw new Error("Ajoutez une référence, un titre et l’adresse exacte de la page d’alerte officielle.");
      let match: SafetyGateMatchRecord = { id: crypto.randomUUID(), watchId, productId: watch?.productId, alertReference, title, alertUrl, riskLevel, matchedTerms: watch?.keywords || [], status: "new", detectedAt: new Date().toISOString() };
      if (persistence) {
        const { data, error: insertError } = await createClient().from("safety_gate_matches").insert({ org_id: persistence.organizationId, watch_id: watchId, product_id: watch?.productId, created_by: persistence.userId, alert_reference: alertReference, title, alert_url: alertUrl, risk_level: riskLevel, matched_terms: watch?.keywords || [], status: "new" }).select("id, detected_at").single();
        if (insertError || !data) throw new Error(insertError?.message || "L’alerte n’a pas pu être enregistrée.");
        match = { ...match, id: data.id, detectedAt: data.detected_at };
      }
      setMatches((current) => [match, ...current]);
      event.currentTarget.reset();
      setFeedback("Alerte enregistrée pour revue et traçabilité.");
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  }

  async function createIncident(match: SafetyGateMatchRecord) {
    setSaving(true); setError(undefined);
    try {
      if (persistence) {
        const { error: rpcError } = await createClient().rpc("create_incident_from_safety_gate", { p_org_id: persistence.organizationId, p_match_id: match.id });
        if (rpcError) throw rpcError;
      }
      setMatches((current) => current.map((item) => item.id === match.id ? { ...item, status: "incident_created" } : item));
      setFeedback("Incident ouvert. Retrouvez-le dans le registre Incidents et rappels.");
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "L’incident n’a pas pu être créé."); }
    finally { setSaving(false); }
  }

  return <div className="professional-stack">
    <section className="professional-summary-grid"><article><span>Veilles actives</span><strong>{watches.filter((item) => item.enabled).length}</strong><small>Synchronisées chaque jour</small></article><article><span>Correspondances</span><strong>{matches.filter((item) => item.status === "new").length}</strong><small>À qualifier humainement</small></article><article><span>Incidents ouverts</span><strong>{matches.filter((item) => item.status === "incident_created").length}</strong><small>Créés depuis Safety Gate</small></article></section>
    <section className="panel professional-form-panel"><div className="professional-panel-heading"><span className="feature-icon feature-icon-amber"><Radar size={21} /></span><div><span className="eyebrow">Synchronisation officielle quotidienne</span><h2>Créer une veille ciblée</h2><p>Chaque jour, le flux XML officiel de la Commission est comparé aux marques, modèles, lots, codes-barres et références enregistrés. Une correspondance reste à valider avant toute action.</p></div></div><form className="professional-form form-grid" onSubmit={addWatch}><label className="field"><span>Produit <em>optionnel</em></span><select name="productId" defaultValue=""><option value="">Veille portefeuille</option>{products.map((product) => <option value={product.id} key={product.id}>{product.name} · {product.sku}</option>)}</select></label><label className="field"><span>Nom de la veille</span><input name="label" required placeholder="Ex. Marque BELLARO" /></label><label className="field"><span>Catégorie Safety Gate <em>terme officiel anglais</em></span><input name="category" minLength={3} maxLength={120} placeholder="Ex. Electrical appliances and equipment" /></label><label className="field"><span>Mots-clés précis</span><input name="keywords" required minLength={3} maxLength={2500} placeholder="BELLARO, LUM-204-FR, modèle" /></label><div className="professional-form-actions field-full"><a className="inline-link" href={officialSafetyGateUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} />Portail officiel Safety Gate</a><button className="button button-primary" disabled={saving}><Plus size={17} />Ajouter la veille</button></div></form></section>
    <section className="panel professional-list-panel"><div className="professional-panel-heading compact"><div><span className="eyebrow">Recherches enregistrées</span><h2>Veilles actives</h2></div><span className="professional-count">{watches.length}</span></div>{watches.length ? <div className="professional-list">{watches.map((watch) => <article className="professional-row" key={watch.id}><span className="feature-icon feature-icon-amber"><Eye size={18} /></span><div className="professional-row-copy"><strong>{watch.label}</strong><p>{watch.keywords.join(" · ")}</p><small>{watch.lastCheckedAt ? `Synchronisée le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(watch.lastCheckedAt))} · ${watch.lastResultCount} résultat${watch.lastResultCount > 1 ? "s" : ""}` : "Première synchronisation planifiée"}</small></div><button className="button button-secondary button-small" type="button" onClick={() => checkWatch(watch)}><RefreshCw size={15} />Vérification manuelle</button></article>)}</div> : <div className="empty-state"><Radar size={29} /><strong>Aucune veille</strong><p>Ajoutez des mots-clés précis pour activer le contrôle quotidien.</p></div>}</section>
    <section className="panel professional-form-panel"><div className="professional-panel-heading"><span className="feature-icon feature-icon-red"><ShieldAlert size={21} /></span><div><span className="eyebrow">Filet de sécurité manuel</span><h2>Consigner une correspondance non détectée</h2><p>Ce formulaire complète la synchronisation automatique. Il accepte uniquement une page d’alerte officielle de la Commission européenne.</p></div></div><form className="professional-form form-grid" onSubmit={addMatch}><label className="field"><span>Veille associée</span><select name="watchId" defaultValue=""><option value="">Sans veille</option>{watches.map((watch) => <option value={watch.id} key={watch.id}>{watch.label}</option>)}</select></label><label className="field"><span>Niveau de risque</span><select name="riskLevel" defaultValue="serious"><option value="serious">Risque sérieux</option><option value="high">Élevé</option><option value="medium">Modéré</option></select></label><label className="field"><span>Référence de l’alerte</span><input name="alertReference" required placeholder="Ex. SR/01234/26" /></label><label className="field"><span>Titre / produit concerné</span><input name="title" required /></label><label className="field field-full"><span>Lien officiel</span><input name="alertUrl" type="url" required pattern="https://ec\.europa\.eu/safety-gate-alerts/screen/webReport/alertDetail/[0-9]+" placeholder="https://ec.europa.eu/safety-gate-alerts/screen/webReport/alertDetail/…" /></label><div className="professional-form-actions field-full"><span /><button className="button button-primary" disabled={saving}><AlertTriangle size={17} />Enregistrer l’alerte</button></div>{feedback ? <p className="form-feedback form-feedback-success field-full" role="status">{feedback}</p> : null}{error ? <p className="form-feedback form-feedback-error field-full" role="alert">{error}</p> : null}</form></section>
    <section className="panel professional-list-panel"><div className="professional-panel-heading compact"><div><span className="eyebrow">Correspondances</span><h2>Alertes à qualifier</h2></div><span className="professional-count">{matches.length}</span></div>{matches.length ? <div className="professional-list">{matches.map((match) => <article className="professional-row" key={match.id}><span className={`professional-status ${match.status === "incident_created" ? "status-completed" : "status-received"}`}>{match.status === "incident_created" ? "Incident créé" : "À examiner"}</span><div className="professional-row-copy"><strong>{match.title}</strong><p>{match.alertReference} · {match.riskLevel}</p><a className="inline-link" href={match.alertUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} />Consulter l’alerte officielle</a></div>{match.status !== "incident_created" ? <button className="button button-primary button-small" disabled={saving} type="button" onClick={() => createIncident(match)}><ShieldAlert size={15} />Ouvrir un incident</button> : null}</article>)}</div> : <div className="empty-state"><ShieldAlert size={29} /><strong>Aucune correspondance</strong><p>Les alertes enregistrées lors des contrôles apparaîtront ici.</p></div>}</section>
  </div>;
}
