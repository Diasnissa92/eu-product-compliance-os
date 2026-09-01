"use client";

import { ArrowLeft, ArrowRight, Check, CheckCircle2, Globe2, PackagePlus, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const steps = [
  { id: 1, label: "Produit" },
  { id: 2, label: "Opérateurs" },
  { id: 3, label: "Marchés" },
  { id: 4, label: "Diagnostic" },
];

const markets = ["France", "Allemagne", "Belgique", "Pays-Bas", "Espagne", "Italie", "Portugal"];
type PersistenceContext = { organizationId: string };

function isRequirementActive(effectiveFrom: string | null, effectiveTo: string | null, today: string) {
  return (!effectiveFrom || effectiveFrom <= today) && (!effectiveTo || effectiveTo >= today);
}

export function NewProductForm({ persistence }: { persistence?: PersistenceContext }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [originCountry, setOriginCountry] = useState("");
  const [economicRole, setEconomicRole] = useState("importer");
  const [hasEuRepresentative, setHasEuRepresentative] = useState(false);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(["France"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const canContinue =
    (step === 1 && name.trim() && sku.trim() && category) ||
    (step === 2 && manufacturer.trim() && originCountry.trim()) ||
    (step === 3 && selectedMarkets.length > 0) ||
    step === 4;

  function toggleMarket(market: string) {
    setSelectedMarkets((current) => current.includes(market) ? current.filter((item) => item !== market) : [...current, market]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < 4) { setStep((current) => current + 1); return; }
    if (!persistence) { router.push("/products/luma-mini?created=1"); return; }

    setSaving(true);
    setError(undefined);
    try {
      const normalizedName = name.trim();
      const normalizedSku = sku.trim();
      const normalizedManufacturer = manufacturer.trim();
      const normalizedOrigin = originCountry.trim();
      if (!normalizedName || normalizedName.length > 240 || !normalizedSku || normalizedSku.length > 240) throw new Error("Le nom et la référence doivent contenir au maximum 240 caractères.");
      if (!normalizedManufacturer || normalizedManufacturer.length > 240 || !normalizedOrigin || normalizedOrigin.length > 240) throw new Error("Le fabricant et le pays d’origine doivent contenir au maximum 240 caractères.");
      if (description.length > 6000) throw new Error("La description dépasse 6 000 caractères.");

      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Votre session a expiré. Reconnectez-vous.");
      const { data: duplicate, error: duplicateError } = await supabase.from("products").select("id").eq("org_id", persistence.organizationId).ilike("sku", normalizedSku).limit(1).maybeSingle();
      if (duplicateError) throw duplicateError;
      if (duplicate) throw new Error("Cette référence / SKU existe déjà dans votre organisation.");

      const sector = category === "Produit de construction" ? "construction" : "consumer";
      const today = new Date().toISOString().slice(0, 10);
      const { data: requirementRows, error: requirementsError } = await supabase
        .from("requirements")
        .select("id, effective_from, effective_to")
        .in("sector", ["cross-sector", sector]);
      const activeRequirements = requirementsError ? [] : (requirementRows ?? []).filter((requirement) => isRequirementActive(requirement.effective_from, requirement.effective_to, today));
      let checklistWarning = requirementsError
        ? `Le catalogue réglementaire n’a pas pu être chargé : ${requirementsError.message}`
        : activeRequirements.length === 0
          ? `Aucun référentiel réglementaire actif n’est chargé pour le secteur « ${sector} ». Le dossier sera créé sans prétendre qu’une checklist réglementaire complète a été générée.`
          : undefined;

      const { data: product, error: productError } = await supabase.from("products").insert({
        org_id: persistence.organizationId,
        created_by: user.id,
        name: normalizedName,
        sku: normalizedSku,
        category,
        sector,
        origin_country: normalizedOrigin,
        manufacturer_name: normalizedManufacturer,
        target_markets: selectedMarkets,
        status: "draft",
        risk_level: "unknown",
      }).select("id").single();
      if (productError || !product) throw new Error(productError?.message || "Le produit n'a pas pu être créé.");

      if (activeRequirements.length) {
        const { error: checklistError } = await supabase.from("product_requirements").insert(activeRequirements.map((requirement) => ({
          org_id: persistence.organizationId,
          product_id: product.id,
          requirement_id: requirement.id,
          status: "pending",
        })));
        if (checklistError) checklistWarning = `La checklist n’a pas été enregistrée correctement : ${checklistError.message}`;
      }

      await supabase.from("audit_events").insert({
        org_id: persistence.organizationId,
        user_id: user.id,
        entity_type: "product",
        entity_id: product.id,
        action: "Dossier produit créé",
        payload: {
          category,
          sector,
          markets: selectedMarkets,
          description: description.trim() || null,
          economic_role: economicRole,
          eu_representative: hasEuRepresentative,
          active_requirement_count: activeRequirements.length,
          checklist_warning: checklistWarning ?? null,
          source: "onboarding_release_gate_v2",
        },
      });

      router.push(`/products/${product.id}?created=1${checklistWarning ? "&setup=partial" : ""}`);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Le produit n’a pas pu être créé.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="new-product-layout" onSubmit={submit}>
      <aside className="creation-sidebar">
        <div><span className="creation-icon"><PackagePlus size={22} /></span><span className="eyebrow">Nouveau dossier</span><h2>Qualifier le produit</h2><p>Les réponses servent à sélectionner uniquement les exigences réellement disponibles dans le catalogue réglementaire.</p></div>
        <ol className="step-list">{steps.map((item) => <li className={item.id === step ? "step-active" : item.id < step ? "step-done" : ""} key={item.id}><span>{item.id < step ? <Check size={15} /> : item.id}</span><div><strong>{item.label}</strong><small>{item.id === 1 ? "Identité et catégorie" : item.id === 2 ? "Chaîne économique" : item.id === 3 ? "Pays de vente" : "Qualification initiale"}</small></div></li>)}</ol>
        <div className="creation-trust"><ShieldCheck size={18} /><span><strong>Qualification fail-closed</strong><small>Aucune règle absente du catalogue n’est inventée ou validée automatiquement.</small></span></div>
      </aside>

      <section className="creation-main">
        <div className="creation-progress"><span style={{ width: `${step * 25}%` }} /></div>
        <div className="creation-content">
          {step === 1 ? <fieldset><legend>Commençons par le produit</legend><p className="field-intro">Ces informations identifient le dossier et permettent de sélectionner une première famille de règles, sans conclure automatiquement à la conformité.</p><div className="form-grid"><label className="field field-full"><span>Nom commercial</span><input autoFocus maxLength={240} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. Lampe Luma Mini" required /></label><label className="field"><span>Référence / SKU</span><input maxLength={240} value={sku} onChange={(event) => setSku(event.target.value)} placeholder="Ex. LUM-204-FR" required /></label><label className="field"><span>Catégorie</span><select value={category} onChange={(event) => setCategory(event.target.value)} required><option value="">Sélectionner</option><option>Équipement électrique</option><option>Équipement radio</option><option>Jouet</option><option>Produit de construction</option><option>Mobilier</option><option>Cosmétique</option><option>Autre produit de consommation</option></select></label><label className="field field-full"><span>Description courte <em>optionnel</em></span><textarea rows={4} maxLength={6000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Fonction, utilisateurs visés, alimentation, matériaux principaux…" /></label></div></fieldset> : null}

          {step === 2 ? <fieldset><legend>Qui fabrique et met le produit sur le marché ?</legend><p className="field-intro">La localisation et le rôle des opérateurs sont enregistrés pour la qualification réglementaire ultérieure.</p><div className="form-grid"><label className="field field-full"><span>Raison sociale du fabricant</span><input autoFocus maxLength={240} value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} placeholder="Ex. Nordhavn Design ApS" required /></label><label className="field"><span>Pays de fabrication</span><input maxLength={240} value={originCountry} onChange={(event) => setOriginCountry(event.target.value)} placeholder="Ex. Danemark" required /></label><label className="field"><span>Votre rôle</span><select value={economicRole} onChange={(event) => setEconomicRole(event.target.value)}><option value="manufacturer">Fabricant</option><option value="importer">Importateur</option><option value="distributor">Distributeur</option><option value="agent">Mandataire</option></select></label><label className="check-card field-full"><input type="checkbox" checked={hasEuRepresentative} onChange={(event) => setHasEuRepresentative(event.target.checked)} /><span><strong>Un mandataire UE est désigné</strong><small>Cette information sera conservée dans le dossier ; son besoin juridique dépend du cadre applicable.</small></span></label></div></fieldset> : null}

          {step === 3 ? <fieldset><legend>Où le produit sera-t-il vendu ?</legend><p className="field-intro">Les marchés sont conservés pour les futures vérifications de langue et d’exigences nationales. Leur sélection ne vaut pas validation automatique.</p><div className="market-picker">{markets.map((market) => { const selected = selectedMarkets.includes(market); return <button className={selected ? "market-option market-selected" : "market-option"} type="button" onClick={() => toggleMarket(market)} key={market}><span><Globe2 size={18} />{market}</span>{selected ? <CheckCircle2 size={18} /> : null}</button>; })}</div><p className="selection-summary">{selectedMarkets.length} marché{selectedMarkets.length > 1 ? "s" : ""} sélectionné{selectedMarkets.length > 1 ? "s" : ""}</p></fieldset> : null}

          {step === 4 ? <fieldset><legend>Qualification initiale prête</legend><p className="field-intro">Au moment de la création, UE Conformité interrogera le catalogue actif. Seules les exigences réellement présentes et en vigueur seront rattachées au dossier.</p><div className="diagnostic-preview"><div className="diagnostic-product"><span className="creation-icon"><PackagePlus size={22} /></span><div><small>Produit</small><strong>{name}</strong><span>{sku} · {category}</span></div></div><div className="diagnostic-grid"><div><small>Fabricant</small><strong>{manufacturer}</strong><span>{originCountry}</span></div><div><small>Marchés</small><strong>{selectedMarkets.length} pays UE</strong><span>{selectedMarkets.join(", ")}</span></div></div><div className="diagnostic-rules"><span><Check size={15} />Le catalogue réglementaire actif sera interrogé à l’enregistrement</span><span><Check size={15} />Aucune directive ou règlement n’est affiché comme applicable s’il n’est pas réellement chargé</span><span><Check size={15} />Si le référentiel manque, le dossier sera signalé comme qualification incomplète</span></div></div><div className="prototype-note"><ShieldCheck size={18} /><p><strong>{persistence ? "Enregistrement contrôlé" : "Mode démonstration"}</strong> {persistence ? "La présence d’une checklist ne constitue pas une certification : chaque exigence et preuve doit encore être revue." : "La création ouvrira un dossier exemple. Connectez-vous pour enregistrer vos données."}</p></div>{error ? <p className="form-feedback form-feedback-error" role="alert">{error}</p> : null}</fieldset> : null}
        </div>

        <div className="creation-footer">{step > 1 ? <button className="button button-secondary" type="button" onClick={() => setStep((current) => current - 1)}><ArrowLeft size={17} />Précédent</button> : <span />}<button className="button button-primary" type="submit" disabled={!canContinue || saving}>{saving ? "Création…" : step === 4 ? "Créer le dossier" : "Continuer"}<ArrowRight size={17} /></button></div>
      </section>
    </form>
  );
}
