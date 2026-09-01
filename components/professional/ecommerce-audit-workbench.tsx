"use client";

import { AlertTriangle, CheckCircle2, CircleAlert, ExternalLink, ScanSearch, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { auditEcommerceListing, type EcommerceAuditResult, type EcommerceListingInput } from "@/lib/ecommerce-audit";
import type { EcommerceAuditRecord, ProfessionalProduct } from "@/lib/professional";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";

type Persistence = { organizationId: string; userId: string };
const emptyListing: EcommerceListingInput = {
  title: "", productIdentifier: "", manufacturerName: "", manufacturerPostalAddress: "", manufacturerElectronicAddress: "", manufacturerElectronicAddressDirect: false,
  responsiblePersonName: "", responsiblePersonPostalAddress: "", responsiblePersonElectronicAddress: "", responsiblePersonElectronicAddressDirect: false, warningsApplicable: true,
  warnings: "", warningsNotApplicableReason: "", language: "Français", traceabilityImage: false,
};

export function EcommerceAuditWorkbench({ products, audits: initialAudits, persistence }: { products: ProfessionalProduct[]; audits: EcommerceAuditRecord[]; persistence?: Persistence }) {
  const router = useRouter();
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || "");
  const [marketplace, setMarketplace] = useState("Site marchand");
  const [listingUrl, setListingUrl] = useState("");
  const [manufacturerInEu, setManufacturerInEu] = useState(true);
  const [listing, setListing] = useState(emptyListing);
  const [result, setResult] = useState<EcommerceAuditResult>();
  const [audits, setAudits] = useState(initialAudits);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const product = products.find((item) => item.id === selectedProductId);
  const manufacturerUsesWebContact = /^https:\/\//i.test(listing.manufacturerElectronicAddress.trim());
  const responsiblePersonUsesWebContact = /^https:\/\//i.test(listing.responsiblePersonElectronicAddress.trim());

  function selectProduct(productId: string) {
    setSelectedProductId(productId);
    const next = products.find((item) => item.id === productId);
    if (next) setListing((current) => ({ ...current, title: next.name, productIdentifier: next.sku, manufacturerName: next.manufacturer }));
  }

  function update<K extends keyof EcommerceListingInput>(key: K, value: EcommerceListingInput[K]) {
    setListing((current) => ({ ...current, [key]: value }));
    setResult(undefined);
  }

  async function runAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      if (!selectedProductId) throw new Error("Sélectionnez un produit.");
      if (listingUrl && !/^https:\/\/[^\s]+$/i.test(listingUrl)) throw new Error("L’URL de l’offre doit être une adresse HTTPS valide.");
      const nextResult = auditEcommerceListing(listing, manufacturerInEu);
      setResult(nextResult);
      const localAudit: EcommerceAuditRecord = { id: crypto.randomUUID(), productId: selectedProductId, marketplace, listingUrl: listingUrl || undefined, score: nextResult.score, status: nextResult.status, findings: nextResult.findings as unknown as Json, createdAt: new Date().toISOString() };
      if (persistence) {
        const { data, error: insertError } = await createClient().from("ecommerce_audits").insert({
          org_id: persistence.organizationId, product_id: selectedProductId, created_by: persistence.userId,
          marketplace, listing_url: listingUrl || undefined, listing_data: { ...listing, manufacturerInEu },
          findings: nextResult.findings as unknown as Json, score: nextResult.score, status: nextResult.status,
        }).select("id, created_at").single();
        if (insertError || !data) throw new Error(insertError?.message || "L’audit n’a pas pu être enregistré.");
        localAudit.id = data.id;
        localAudit.createdAt = data.created_at;
      }
      setAudits((current) => [localAudit, ...current]);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "L’audit n’a pas pu être exécuté.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="professional-stack">
    <section className="panel professional-form-panel">
      <div className="professional-panel-heading"><span className="feature-icon feature-icon-blue"><ScanSearch size={21} /></span><div><span className="eyebrow">Contrôle GPSR · article 19</span><h2>Vérifier une offre avant sa publication</h2><p>Renseignez ce qui est réellement visible pour l’acheteur. Le contrôle suit les mentions de vente à distance du règlement (UE) 2023/988, sans présenter le résultat comme une certification.</p><a className="inline-link" href="https://eur-lex.europa.eu/eli/reg/2023/988/oj" target="_blank" rel="noreferrer"><ExternalLink size={14} />Consulter la source officielle</a></div></div>
      <form className="professional-form form-grid" onSubmit={runAudit}>
        <label className="field"><span>Produit</span><select value={selectedProductId} onChange={(event) => selectProduct(event.target.value)} required><option value="">Sélectionner</option>{products.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.sku}</option>)}</select></label>
        <label className="field"><span>Canal de vente</span><select value={marketplace} onChange={(event) => setMarketplace(event.target.value)}><option>Site marchand</option><option>Amazon</option><option>ManoMano</option><option>Marketplace</option><option>Catalogue B2B</option></select></label>
        <label className="field field-full"><span>URL de l’offre <em>optionnel, conservé comme preuve</em></span><input type="url" pattern="https://.*" maxLength={2000} value={listingUrl} onChange={(event) => setListingUrl(event.target.value)} placeholder="https://…" /></label>
        <label className="check-card field-full"><input type="checkbox" checked={manufacturerInEu} onChange={(event) => setManufacturerInEu(event.target.checked)} /><span><strong>Le fabricant est établi dans l’Union européenne</strong><small>Décochez pour contrôler aussi les mentions du responsable UE.</small></span></label>
        <label className="field"><span>Type / désignation du produit</span><input maxLength={240} value={listing.title} onChange={(event) => update("title", event.target.value)} placeholder="Ex. Lampe de table" /></label>
        <label className="field"><span>Autre identifiant produit</span><input maxLength={240} value={listing.productIdentifier} onChange={(event) => update("productIdentifier", event.target.value)} placeholder="Référence, modèle, lot…" /></label>
        <label className="field"><span>Nom du fabricant</span><input maxLength={240} value={listing.manufacturerName} onChange={(event) => update("manufacturerName", event.target.value)} /></label>
        <label className="field"><span>Adresse postale du fabricant</span><input maxLength={1000} value={listing.manufacturerPostalAddress} onChange={(event) => update("manufacturerPostalAddress", event.target.value)} /></label>
        <label className="field field-full"><span>Adresse électronique du fabricant</span><input maxLength={2000} value={listing.manufacturerElectronicAddress} onChange={(event) => { update("manufacturerElectronicAddress", event.target.value); if (!/^https:\/\//i.test(event.target.value.trim())) update("manufacturerElectronicAddressDirect", false); }} placeholder="contact@fabricant.eu ou https://fabricant.eu/contact" /><small>Une URL n’est valable que si elle permet de contacter directement le fabricant ; une simple page d’accueil ne suffit pas.</small></label>
        {manufacturerUsesWebContact ? <label className="check-card field-full"><input type="checkbox" checked={listing.manufacturerElectronicAddressDirect} onChange={(event) => update("manufacturerElectronicAddressDirect", event.target.checked)} /><span><strong>Cette URL ouvre un canal de contact direct</strong><small>Confirmez uniquement s’il s’agit d’un formulaire ou d’un moyen permettant d’envoyer directement un message au fabricant.</small></span></label> : null}
        {!manufacturerInEu ? <><label className="field"><span>Nom du responsable UE</span><input maxLength={240} value={listing.responsiblePersonName} onChange={(event) => update("responsiblePersonName", event.target.value)} /></label><label className="field"><span>Adresse postale du responsable UE</span><input maxLength={1000} value={listing.responsiblePersonPostalAddress} onChange={(event) => update("responsiblePersonPostalAddress", event.target.value)} /></label><label className="field field-full"><span>Adresse électronique du responsable UE</span><input maxLength={2000} value={listing.responsiblePersonElectronicAddress} onChange={(event) => { update("responsiblePersonElectronicAddress", event.target.value); if (!/^https:\/\//i.test(event.target.value.trim())) update("responsiblePersonElectronicAddressDirect", false); }} placeholder="contact@responsable.eu ou https://responsable.eu/contact" /></label>{responsiblePersonUsesWebContact ? <label className="check-card field-full"><input type="checkbox" checked={listing.responsiblePersonElectronicAddressDirect} onChange={(event) => update("responsiblePersonElectronicAddressDirect", event.target.checked)} /><span><strong>Cette URL permet un contact direct avec le responsable UE</strong><small>Une simple page web statique n’est pas suffisante.</small></span></label> : null}</> : null}
        <label className="check-card field-full"><input type="checkbox" checked={listing.warningsApplicable} onChange={(event) => update("warningsApplicable", event.target.checked)} /><span><strong>Des avertissements ou informations de sécurité sont applicables</strong><small>Décochez uniquement si l’analyse de risques et les textes applicables concluent qu’aucune mention spécifique n’est requise.</small></span></label>
        {listing.warningsApplicable ? <><label className="field field-full"><span>Avertissements et informations de sécurité visibles</span><textarea rows={4} maxLength={6000} value={listing.warnings} onChange={(event) => update("warnings", event.target.value)} placeholder="Copiez ici les avertissements affichés avant l’achat." /></label><label className="field"><span>Langue des informations de sécurité</span><input maxLength={120} value={listing.language} onChange={(event) => update("language", event.target.value)} /></label></> : <label className="field field-full"><span>Justification de non-applicabilité</span><textarea rows={3} maxLength={6000} value={listing.warningsNotApplicableReason} onChange={(event) => update("warningsNotApplicableReason", event.target.value)} placeholder="Référencez l’analyse de risques et les textes vérifiés." /></label>}
        <label className="check-card"><input type="checkbox" checked={listing.traceabilityImage} onChange={(event) => update("traceabilityImage", event.target.checked)} /><span><strong>Image du produit présente</strong><small>Le produit est clairement reconnaissable avant l’achat.</small></span></label>
        <div className="professional-form-actions field-full"><span className="secure-note"><ShieldCheck size={16} />Aucun score n’est présenté comme une certification</span><button className="button button-primary" disabled={saving || !product}><ScanSearch size={17} />{saving ? "Contrôle…" : "Lancer et enregistrer l’audit"}</button></div>
        {error ? <p className="form-feedback form-feedback-error field-full" role="alert">{error}</p> : null}
      </form>
    </section>

    {result ? <section className={`audit-result audit-result-${result.status}`} aria-live="polite"><div className="audit-score"><strong>{result.score}%</strong><span>complétude</span></div><div className="audit-result-copy"><span className="eyebrow">Résultat du contrôle</span><h2>{result.status === "compliant" ? "Offre prête pour la revue finale" : result.status === "blocking" ? "Publication à bloquer" : "Corrections recommandées"}</h2><p>{result.summary}</p></div><div className="audit-findings">{result.findings.map((finding) => <article key={finding.id}><span className={`finding-icon finding-${finding.status}`}>{finding.status === "pass" ? <CheckCircle2 size={16} /> : finding.status === "fail" ? <CircleAlert size={16} /> : <AlertTriangle size={16} />}</span><div><strong>{finding.label}</strong><small>{finding.detail}</small><small>{finding.legalReference}</small></div></article>)}</div></section> : null}

    <section className="panel professional-list-panel"><div className="professional-panel-heading compact"><div><span className="eyebrow">Historique</span><h2>Audits enregistrés</h2></div><span className="professional-count">{audits.length}</span></div>{audits.length ? <div className="professional-list">{audits.map((audit) => { const auditedProduct = products.find((item) => item.id === audit.productId); return <article className="professional-row" key={audit.id}><span className={`audit-mini-score audit-mini-${audit.status}`}>{audit.score}%</span><div className="professional-row-copy"><strong>{auditedProduct?.name || "Produit"}</strong><p>{audit.marketplace} · {new Intl.DateTimeFormat("fr-FR").format(new Date(audit.createdAt))}</p><small>{audit.status === "compliant" ? "Complet" : audit.status === "blocking" ? "Blocages détectés" : "À revoir"}</small></div>{audit.listingUrl ? <a className="button button-secondary button-small" href={audit.listingUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} />Voir l’offre</a> : null}</article>; })}</div> : <div className="empty-state"><ScanSearch size={29} /><strong>Aucun audit e-commerce</strong><p>Le premier résultat apparaîtra ici avec sa date et son score.</p></div>}</section>
  </div>;
}
