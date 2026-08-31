"use client";

import { Archive, Clipboard, Download, ExternalLink, Globe2, QrCode as QrCodeIcon, Save, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { copyText } from "@/lib/client-actions";
import type { ProfessionalProduct } from "@/lib/professional";
import { createPassportQrDataUrl } from "@/lib/qr-code";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";

type Persistence = { organizationId: string };

function dppIdentifier(product: ProfessionalProduct) {
  const sku = product.sku.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "PRODUCT";
  return `EUCP-${sku}-${product.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function textValue(value: Json | undefined) {
  return typeof value === "string" ? value : "";
}

function PassportQr({ path, identifier }: { path: string; identifier: string }) {
  const [dataUrl, setDataUrl] = useState<string>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    let active = true;
    createPassportQrDataUrl(`${window.location.origin}${path}`)
      .then((value) => { if (active) setDataUrl(value); })
      .catch(() => { if (active) setError("QR indisponible : vérifiez l’adresse publique."); });
    return () => { active = false; };
  }, [path]);
  return <div className="passport-qr">{dataUrl ? <Image unoptimized src={dataUrl} alt={`QR code du passeport ${identifier}`} width={180} height={180} /> : <span className="qr-placeholder"><QrCodeIcon size={38} /></span>}{dataUrl ? <a className="button button-secondary button-small" href={dataUrl} download={`${identifier}-qr.png`}><Download size={15} />Télécharger le QR</a> : <button className="button button-secondary button-small" type="button" disabled><Download size={15} />QR en préparation</button>}{error ? <small className="form-feedback form-feedback-error" role="alert">{error}</small> : null}</div>;
}

function PassportCard({ product, persistence, onSaved }: { product: ProfessionalProduct; persistence?: Persistence; onSaved: (product: ProfessionalProduct) => void }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string>();
  const [error, setError] = useState<string>();
  const identifier = product.dppIdentifier || dppIdentifier(product);
  const publicPath = `/passport/${identifier}`;
  const published = product.dppStatus === "published";

  async function save(formElement: HTMLFormElement, publish: boolean) {
    setSaving(true);
    setError(undefined);
    setFeedback(undefined);
    const form = new FormData(formElement);
    const publicData = {
      description: String(form.get("description") || "").trim(),
      materials: String(form.get("materials") || "").split(/[\n,;]/).map((item) => item.trim()).filter(Boolean),
      repairInstructions: String(form.get("repairInstructions") || "").trim(),
      disposalInstructions: String(form.get("disposalInstructions") || "").trim(),
      supportUrl: String(form.get("supportUrl") || "").trim(),
    };
    const now = new Date().toISOString();
    const next: ProfessionalProduct = { ...product, dppIdentifier: identifier, dppStatus: publish ? "published" : "draft", dppPublicData: publicData as unknown as Record<string, Json | undefined> };
    try {
      if (publicData.supportUrl && !/^https:\/\/[^\s]+$/i.test(publicData.supportUrl)) throw new Error("Le lien de notice doit être une adresse HTTPS valide.");
      if (publicData.supportUrl.length > 2000) throw new Error("Le lien de notice est trop long.");
      if ([publicData.description, publicData.repairInstructions, publicData.disposalInstructions].some((value) => value.length > 6000)) throw new Error("Une section publique dépasse 6 000 caractères.");
      if (publicData.materials.length > 50 || publicData.materials.some((value) => value.length > 120)) throw new Error("La liste des matériaux est trop longue.");
      if (persistence) {
        const { error: updateError } = await createClient().from("products").update({
          dpp_identifier: identifier,
          dpp_status: publish ? "published" : "draft",
          dpp_public_data: publicData,
          dpp_updated_at: now,
          dpp_published_at: publish ? now : null,
        }).eq("id", product.id).eq("org_id", persistence.organizationId);
        if (updateError) throw updateError;
      }
      onSaved(next);
      setFeedback(publish ? "Passeport publié : le QR code ouvre maintenant la fiche publique." : "Brouillon du passeport enregistré.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Le passeport n’a pas pu être enregistré.");
    } finally {
      setSaving(false);
    }
  }

  async function copyPublicLink() {
    await copyText(`${window.location.origin}${publicPath}`);
    setFeedback("Lien public du passeport copié.");
  }

  return <article className="panel passport-card">
    <div className="passport-card-heading"><div><span className={`professional-status ${published ? "status-completed" : "status-draft"}`}>{published ? "Publié" : "Brouillon"}</span><h2>{product.name}</h2><p>{product.sku} · {product.category}</p></div><span className="passport-id">{identifier}</span></div>
    <div className="passport-layout">
      <form className="professional-form form-grid" onSubmit={(event) => { event.preventDefault(); void save(event.currentTarget, false); }}>
        <label className="field field-full"><span>Description publique</span><textarea name="description" rows={3} maxLength={6000} defaultValue={textValue(product.dppPublicData.description)} placeholder="Fonction, usage prévu et caractéristiques principales." /></label>
        <label className="field field-full"><span>Matériaux principaux <em>séparés par des virgules</em></span><input name="materials" maxLength={6000} defaultValue={Array.isArray(product.dppPublicData.materials) ? product.dppPublicData.materials.filter((item): item is string => typeof item === "string").join(", ") : ""} placeholder="Aluminium, verre, cuivre…" /></label>
        <label className="field"><span>Réparation et entretien</span><textarea name="repairInstructions" rows={3} maxLength={6000} defaultValue={textValue(product.dppPublicData.repairInstructions)} /></label>
        <label className="field"><span>Fin de vie / tri</span><textarea name="disposalInstructions" rows={3} maxLength={6000} defaultValue={textValue(product.dppPublicData.disposalInstructions)} /></label>
        <label className="field field-full"><span>Lien notice ou assistance <em>HTTPS</em></span><input name="supportUrl" type="url" pattern="https://.*" maxLength={2000} defaultValue={textValue(product.dppPublicData.supportUrl)} placeholder="https://…" /></label>
        <div className="professional-form-actions field-full"><span className="secure-note"><ShieldCheck size={16} />Seules ces données sont rendues publiques</span><div className="button-row"><button className="button button-secondary" disabled={saving}><Save size={16} />Enregistrer</button><button className="button button-primary" type="button" disabled={saving} onClick={(event) => { if (event.currentTarget.form) void save(event.currentTarget.form, true); }}><Globe2 size={16} />{published ? "Mettre à jour" : "Publier"}</button></div></div>
        {feedback ? <p className="form-feedback form-feedback-success field-full" role="status">{feedback}</p> : null}
        {error ? <p className="form-feedback form-feedback-error field-full" role="alert">{error}</p> : null}
      </form>
      <aside className="passport-side"><PassportQr key={publicPath} path={publicPath} identifier={identifier} /><p>Le QR code contient uniquement l’adresse permanente HTTPS du passeport, pas les données du produit.</p><button className="button button-secondary button-small" type="button" onClick={copyPublicLink}><Clipboard size={15} />Copier le lien</button>{published ? <a className="button button-dark button-small" href={publicPath} target="_blank" rel="noreferrer"><ExternalLink size={15} />Voir la fiche publique</a> : <span className="passport-draft-note"><Archive size={15} />La fiche reste privée tant qu’elle n’est pas publiée.</span>}</aside>
    </div>
  </article>;
}

export function PassportManager({ products: initialProducts, persistence }: { products: ProfessionalProduct[]; persistence?: Persistence }) {
  const [products, setProducts] = useState(initialProducts);
  const published = products.filter((product) => product.dppStatus === "published").length;
  return <div className="professional-stack">
    <section className="professional-summary-grid"><article><span>Passeports publiés</span><strong>{published}</strong><small>Accessibles par QR</small></article><article><span>Brouillons</span><strong>{products.length - published}</strong><small>À enrichir</small></article><article><span>Couverture</span><strong>{products.length ? Math.round((published / products.length) * 100) : 0}%</strong><small>Du portefeuille</small></article></section>
    <div className="passport-list">{products.length ? products.map((product) => <PassportCard key={product.id} product={product} persistence={persistence} onSaved={(updated) => setProducts((current) => current.map((item) => item.id === updated.id ? updated : item))} />) : <section className="panel empty-state"><QrCodeIcon size={31} /><strong>Aucun produit disponible</strong><p>Créez un produit avant de publier son passeport numérique.</p></section>}</div>
  </div>;
}
