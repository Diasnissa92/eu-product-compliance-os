"use client";

import { CheckCircle2, ExternalLink, ListChecks, Save, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import {
  assessRegulatoryProfile,
  buildRegulatoryActionPlan,
  REGULATORY_ENGINE_VERSION,
  type RegulatoryProfile,
} from "@/lib/regulatory-engine";
import { createClient } from "@/lib/supabase/client";

const outcomeLabel = {
  applicable: "Applicable",
  not_applicable: "Non applicable",
  needs_information: "Information manquante",
  human_review: "Revue humaine",
} as const;

const severityLabel = {
  medium: "À compléter",
  high: "À valider",
  blocking: "Bloquant avant mise sur le marché",
} as const;

type Props = {
  organizationId: string;
  productId: string;
  category: string;
};

export function RegulatoryAssessmentWorkbench({ organizationId, productId, category }: Props) {
  const [intendedForConsumers, setIntendedForConsumers] = useState<boolean | undefined>();
  const [distanceSale, setDistanceSale] = useState<boolean | undefined>();
  const [manufacturerEstablishedInEu, setManufacturerEstablishedInEu] = useState<boolean | undefined>();
  const [euResponsiblePersonIdentified, setEuResponsiblePersonIdentified] = useState<boolean | undefined>();
  const [electrical, setElectrical] = useState<boolean | undefined>(["Équipement électrique", "Équipement radio"].includes(category) ? true : undefined);
  const [radio, setRadio] = useState<boolean | undefined>(category === "Équipement radio" ? true : undefined);
  const [battery, setBattery] = useState<boolean | undefined>();
  const [packagedProduct, setPackagedProduct] = useState<boolean | undefined>();
  const [toy, setToy] = useState<boolean | undefined>(category === "Jouet" ? true : undefined);
  const [ppe, setPpe] = useState<boolean | undefined>();
  const [machinery, setMachinery] = useState<boolean | undefined>();
  const [acVoltage, setAcVoltage] = useState("");
  const [dcVoltage, setDcVoltage] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const profile: RegulatoryProfile = useMemo(() => ({
    category,
    sector: category === "Produit de construction" ? "construction" : "consumer",
    intendedForConsumers,
    distanceSale,
    manufacturerEstablishedInEu,
    euResponsiblePersonIdentified,
    electricalElectronicEquipment: electrical,
    emitsOrReceivesRadio: radio,
    containsBattery: battery,
    packagedProduct,
    toy,
    ppe,
    machinery,
    constructionProduct: category === "Produit de construction" ? true : undefined,
    nominalVoltageAc: acVoltage ? Number(acVoltage) : null,
    nominalVoltageDc: dcVoltage ? Number(dcVoltage) : null,
  }), [
    category,
    intendedForConsumers,
    distanceSale,
    manufacturerEstablishedInEu,
    euResponsiblePersonIdentified,
    electrical,
    radio,
    battery,
    packagedProduct,
    toy,
    ppe,
    machinery,
    acVoltage,
    dcVoltage,
  ]);

  const results = useMemo(() => assessRegulatoryProfile(profile), [profile]);
  const actionPlan = useMemo(() => buildRegulatoryActionPlan(profile, results), [profile, results]);
  const missingFacts = results.filter((result) => result.outcome === "needs_information").length;
  const humanReviews = results.filter((result) => result.outcome === "human_review").length;

  async function save() {
    setPending(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Session expirée.");

      // @ts-expect-error Database types are regenerated after the Phase 3 migration is merged.
      const { error: profileError } = await supabase.from("products").update({ regulatory_profile: profile }).eq("id", productId).eq("org_id", organizationId);
      if (profileError) throw profileError;

      const assessmentRows = results.map((result) => ({
        org_id: organizationId,
        product_id: productId,
        regulation_code: result.regulationCode,
        outcome: result.outcome,
        rationale: result.rationale,
        engine_version: REGULATORY_ENGINE_VERSION,
        inputs: profile,
        source_url: result.sourceUrl,
        source_reference: result.sourceReference,
        assessed_by: user.id,
        assessed_at: new Date().toISOString(),
      }));
      // @ts-expect-error Database types are regenerated after the Phase 3 migration is merged.
      const { error: assessmentError } = await supabase.from("product_regulatory_assessments").upsert(assessmentRows, { onConflict: "product_id,regulation_code,engine_version" });
      if (assessmentError) throw assessmentError;

      // Conserver l’état collaboratif d’une action déjà créée (assignation, échéance, clôture).
      // @ts-expect-error Database types are regenerated after the Phase 3 migration is merged.
      const { data: existingActions, error: existingError } = await supabase.from("regulatory_action_items")
        .select("action_key,status,assignee_id,due_date")
        .eq("org_id", organizationId)
        .eq("product_id", productId)
        .eq("engine_version", REGULATORY_ENGINE_VERSION);
      if (existingError) throw existingError;
      const existing = new Map((existingActions ?? []).map((item: { action_key: string; status: string; assignee_id: string | null; due_date: string | null }) => [item.action_key, item]));

      const actionRows = actionPlan.map((action) => {
        const current = existing.get(action.actionKey);
        return {
          org_id: organizationId,
          product_id: productId,
          regulation_code: action.regulationCode,
          action_key: action.actionKey,
          title: action.title,
          kind: action.kind,
          severity: action.severity,
          status: current?.status ?? "open",
          rationale: action.rationale,
          source_url: action.sourceUrl,
          source_reference: action.sourceReference,
          engine_version: REGULATORY_ENGINE_VERSION,
          assignee_id: current?.assignee_id ?? null,
          due_date: current?.due_date ?? null,
          created_by: user.id,
        };
      });
      if (actionRows.length) {
        // @ts-expect-error Database types are regenerated after the Phase 3 migration is merged.
        const { error: actionsError } = await supabase.from("regulatory_action_items").upsert(actionRows, { onConflict: "product_id,action_key,engine_version" });
        if (actionsError) throw actionsError;
      }

      setMessage(`Évaluation ${REGULATORY_ENGINE_VERSION} enregistrée avec ${actionPlan.length} action${actionPlan.length > 1 ? "s" : ""} de qualification. Les revues humaines restent à valider par l’organisation.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "L’évaluation n’a pas pu être enregistrée.");
    } finally {
      setPending(false);
    }
  }

  function triState(label: string, value: boolean | undefined, setValue: (value: boolean | undefined) => void, help?: string) {
    return <label className="field"><span>{label}</span><select value={value === undefined ? "unknown" : value ? "yes" : "no"} onChange={(event) => setValue(event.target.value === "unknown" ? undefined : event.target.value === "yes")}><option value="unknown">Information inconnue</option><option value="yes">Oui</option><option value="no">Non</option></select>{help ? <small>{help}</small> : null}</label>;
  }

  return <div className="professional-stack">
    <section className="panel professional-form-panel">
      <div className="professional-panel-heading"><span className="feature-icon feature-icon-blue"><ShieldAlert size={21}/></span><div><span className="eyebrow">Moteur {REGULATORY_ENGINE_VERSION}</span><h2>Qualifier le produit avant de générer des actions</h2><p>Répondez avec des faits vérifiés. Une inconnue reste inconnue et aucune revue humaine n’est transformée en certification.</p></div></div>

      <div className="professional-subsection"><div><span className="eyebrow">01 · Marché et opérateurs</span><h3>Qui utilise et met le produit sur le marché ?</h3></div><div className="professional-form form-grid">
        {triState("Produit destiné ou prévisible pour des consommateurs", intendedForConsumers, setIntendedForConsumers)}
        {triState("Produit vendu en ligne ou à distance", distanceSale, setDistanceSale, "Déclenche le contrôle spécifique GPSR Article 19 lorsque le produit relève du GPSR.")}
        {triState("Fabricant établi dans l’Union européenne", manufacturerEstablishedInEu, setManufacturerEstablishedInEu)}
        {manufacturerEstablishedInEu === false ? triState("Personne responsable établie dans l’UE déjà identifiée", euResponsiblePersonIdentified, setEuResponsiblePersonIdentified, "Le GPSR Article 16 exige un opérateur économique établi dans l’Union pour les produits couverts.") : null}
      </div></div>

      <div className="professional-subsection"><div><span className="eyebrow">02 · Technologie</span><h3>Électricité, radio, batterie</h3></div><div className="professional-form form-grid">
        {triState("Équipement électrique ou électronique", electrical, setElectrical)}
        {triState("Émet ou reçoit intentionnellement des ondes radio", radio, setRadio)}
        {triState("Contient ou intègre une batterie", battery, setBattery, "Le règlement batteries couvre aussi les batteries incorporées à des produits.")}
        <label className="field"><span>Tension nominale AC <em>volts</em></span><input type="number" min="0" max="100000" step="0.1" value={acVoltage} onChange={(event) => setAcVoltage(event.target.value)} placeholder="Ex. 230"/></label>
        <label className="field"><span>Tension nominale DC <em>volts</em></span><input type="number" min="0" max="100000" step="0.1" value={dcVoltage} onChange={(event) => setDcVoltage(event.target.value)} placeholder="Ex. 24"/></label>
      </div></div>

      <div className="professional-subsection"><div><span className="eyebrow">03 · Catégories et emballage</span><h3>Règles sectorielles à vérifier</h3></div><div className="professional-form form-grid">
        {triState("Produit qualifiable comme jouet", toy, setToy)}
        {triState("Équipement de protection individuelle", ppe, setPpe)}
        {triState("Machine, quasi-machine ou produit connexe", machinery, setMachinery)}
        {triState("Produit mis à disposition avec un emballage", packagedProduct, setPackagedProduct, "Le PPWR s’applique depuis le 12 août 2026 aux emballages selon le rôle de l’opérateur.")}
      </div></div>
    </section>

    <section className="panel professional-list-panel">
      <div className="professional-panel-heading compact"><div><span className="eyebrow">Résultat explicable</span><h2>Cadres à examiner</h2><p>{missingFacts} information{missingFacts > 1 ? "s" : ""} manquante{missingFacts > 1 ? "s" : ""} · {humanReviews} revue{humanReviews > 1 ? "s" : ""} humaine{humanReviews > 1 ? "s" : ""}</p></div><span className="professional-count">{results.length}</span></div>
      <div className="incident-list">{results.map((result) => <article className="professional-row" key={result.regulationCode}><div><span className={`professional-status status-${result.outcome === "not_applicable" ? "closed" : result.outcome === "needs_information" ? "pending" : "open"}`}>{outcomeLabel[result.outcome]}</span><h3>{result.title}</h3><p>{result.rationale}</p><a className="inline-link" href={result.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Source officielle · {result.sourceReference}</a></div></article>)}</div>
    </section>

    <section className="panel professional-list-panel">
      <div className="professional-panel-heading compact"><span className="feature-icon feature-icon-rose"><ListChecks size={20}/></span><div><span className="eyebrow">Plan de qualification</span><h2>Actions à traiter par l’équipe</h2><p>Ces actions organisent la revue ; elles ne sont pas présentées comme des obligations définitives tant que le champ d’application n’est pas validé.</p></div><span className="professional-count">{actionPlan.length}</span></div>
      <div className="incident-list">{actionPlan.map((action) => <article className="professional-row" key={action.actionKey}><div><span className={`professional-status status-${action.severity === "blocking" ? "open" : action.severity === "high" ? "pending" : "draft"}`}>{severityLabel[action.severity]}</span><h3>{action.title}</h3><p>{action.rationale}</p><a className="inline-link" href={action.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/>{action.regulationCode} · {action.sourceReference}</a></div></article>)}</div>
      {error ? <p className="form-feedback form-feedback-error" role="alert">{error}</p> : null}
      {message ? <p className="form-feedback form-feedback-success"><CheckCircle2 size={16}/>{message}</p> : null}
      <div className="professional-form-actions"><span className="secure-note">Aucun résultat n’est une certification automatique</span><button className="button button-primary" type="button" disabled={pending} onClick={() => void save()}><Save size={16}/>{pending ? "Enregistrement…" : "Enregistrer l’évaluation et les actions"}</button></div>
    </section>
  </div>;
}
