"use client";

import { CheckCircle2, ExternalLink, Save, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { assessRegulatoryProfile, REGULATORY_ENGINE_VERSION, type RegulatoryProfile } from "@/lib/regulatory-engine";
import { createClient } from "@/lib/supabase/client";

const outcomeLabel = {
  applicable: "Applicable",
  not_applicable: "Non applicable",
  needs_information: "Information manquante",
  human_review: "Revue humaine",
} as const;

type Props = {
  organizationId: string;
  productId: string;
  category: string;
};

export function RegulatoryAssessmentWorkbench({ organizationId, productId, category }: Props) {
  const [intendedForConsumers, setIntendedForConsumers] = useState<boolean | undefined>();
  const [electrical, setElectrical] = useState<boolean | undefined>(["Équipement électrique", "Équipement radio"].includes(category) ? true : undefined);
  const [radio, setRadio] = useState<boolean | undefined>(category === "Équipement radio" ? true : undefined);
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
    electricalElectronicEquipment: electrical,
    emitsOrReceivesRadio: radio,
    toy,
    ppe,
    machinery,
    constructionProduct: category === "Produit de construction" ? true : undefined,
    nominalVoltageAc: acVoltage ? Number(acVoltage) : null,
    nominalVoltageDc: dcVoltage ? Number(dcVoltage) : null,
  }), [category, intendedForConsumers, electrical, radio, toy, ppe, machinery, acVoltage, dcVoltage]);

  const results = useMemo(() => assessRegulatoryProfile(profile), [profile]);

  async function save() {
    setPending(true); setError(undefined); setMessage(undefined);
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Session expirée.");
      // @ts-expect-error Database types are regenerated after the Phase 2 migration is merged.
      const { error: profileError } = await supabase.from("products").update({ regulatory_profile: profile }).eq("id", productId).eq("org_id", organizationId);
      if (profileError) throw profileError;
      const rows = results.map((result) => ({
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
      // @ts-expect-error Database types are regenerated after the Phase 2 migration is merged.
      const { error: assessmentError } = await supabase.from("product_regulatory_assessments").upsert(rows, { onConflict: "product_id,regulation_code,engine_version" });
      if (assessmentError) throw assessmentError;
      setMessage(`Évaluation ${REGULATORY_ENGINE_VERSION} enregistrée. Les résultats marqués « Revue humaine » ne sont pas des validations automatiques.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "L’évaluation n’a pas pu être enregistrée.");
    } finally { setPending(false); }
  }

  function triState(label: string, value: boolean | undefined, setValue: (value: boolean | undefined) => void) {
    return <label className="field"><span>{label}</span><select value={value === undefined ? "unknown" : value ? "yes" : "no"} onChange={(event) => setValue(event.target.value === "unknown" ? undefined : event.target.value === "yes")}><option value="unknown">Information inconnue</option><option value="yes">Oui</option><option value="no">Non</option></select></label>;
  }

  return <div className="professional-stack">
    <section className="panel professional-form-panel">
      <div className="professional-panel-heading"><span className="feature-icon feature-icon-blue"><ShieldAlert size={21}/></span><div><span className="eyebrow">Moteur {REGULATORY_ENGINE_VERSION}</span><h2>Qualifier le produit avant de générer des obligations</h2><p>Une information inconnue reste inconnue : le moteur ne la remplace jamais par une hypothèse favorable.</p></div></div>
      <div className="professional-form form-grid">
        {triState("Produit destiné ou prévisible pour des consommateurs", intendedForConsumers, setIntendedForConsumers)}
        {triState("Équipement électrique ou électronique", electrical, setElectrical)}
        {triState("Émet ou reçoit intentionnellement des ondes radio", radio, setRadio)}
        {triState("Produit qualifiable comme jouet", toy, setToy)}
        {triState("Équipement de protection individuelle", ppe, setPpe)}
        {triState("Machine ou produit connexe", machinery, setMachinery)}
        <label className="field"><span>Tension nominale AC <em>volts</em></span><input type="number" min="0" max="100000" step="0.1" value={acVoltage} onChange={(event) => setAcVoltage(event.target.value)} placeholder="Ex. 230"/></label>
        <label className="field"><span>Tension nominale DC <em>volts</em></span><input type="number" min="0" max="100000" step="0.1" value={dcVoltage} onChange={(event) => setDcVoltage(event.target.value)} placeholder="Ex. 24"/></label>
      </div>
    </section>

    <section className="panel professional-list-panel">
      <div className="professional-panel-heading compact"><div><span className="eyebrow">Résultat explicable</span><h2>Cadres à examiner</h2></div><span className="professional-count">{results.length}</span></div>
      <div className="incident-list">{results.map((result) => <article className="professional-row" key={result.regulationCode}><div><span className={`professional-status status-${result.outcome === "not_applicable" ? "closed" : result.outcome === "needs_information" ? "pending" : "open"}`}>{outcomeLabel[result.outcome]}</span><h3>{result.title}</h3><p>{result.rationale}</p><a className="inline-link" href={result.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Source officielle · {result.sourceReference}</a></div></article>)}</div>
      {error ? <p className="form-feedback form-feedback-error" role="alert">{error}</p> : null}
      {message ? <p className="form-feedback form-feedback-success"><CheckCircle2 size={16}/>{message}</p> : null}
      <div className="professional-form-actions"><span className="secure-note">Aucun résultat n’est une certification automatique</span><button className="button button-primary" type="button" disabled={pending} onClick={() => void save()}><Save size={16}/>{pending ? "Enregistrement…" : "Enregistrer l’évaluation"}</button></div>
    </section>
  </div>;
}
