"use client";

import { AlertCircle, Building2, Globe2, MapPin, PackageCheck, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PersistenceContext, Product } from "@/lib/types";

const markets = ["France", "Allemagne", "Belgique", "Pays-Bas", "Espagne", "Italie", "Portugal"];

export function ProductInformationEditor({ product, persistence }: { product: Product; persistence: PersistenceContext }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(product.name);
  const [sku, setSku] = useState(product.sku);
  const [manufacturer, setManufacturer] = useState(product.manufacturer);
  const [originCountry, setOriginCountry] = useState(product.originCountry);
  const [destinationMarkets, setDestinationMarkets] = useState(product.destinationMarkets);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function toggleMarket(market: string) {
    setDestinationMarkets((current) => current.includes(market) ? current.filter((item) => item !== market) : [...current, market]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    if (!destinationMarkets.length) {
      setError("Sélectionnez au moins un marché de destination.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError("Votre session a expiré. Reconnectez-vous.");
      setPending(false);
      return;
    }

    const update = {
      name: name.trim(),
      sku: sku.trim() || null,
      manufacturer_name: manufacturer.trim() || null,
      origin_country: originCountry.trim() || null,
      target_markets: destinationMarkets,
      updated_at: new Date().toISOString(),
    };
    const { data: updatedProduct, error: updateError } = await supabase
      .from("products")
      .update(update)
      .eq("id", persistence.productId)
      .eq("org_id", persistence.organizationId)
      .select("id")
      .single();

    if (updateError || !updatedProduct) {
      setError(`Le produit n’a pas pu être mis à jour : ${updateError?.message ?? "accès refusé"}`);
      setPending(false);
      return;
    }

    await supabase.from("audit_events").insert({
      org_id: persistence.organizationId,
      user_id: user.id,
      entity_type: "product",
      entity_id: persistence.productId,
      action: "Informations produit mises à jour",
      payload: { fields: Object.keys(update) },
    });

    setPending(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button className="text-link" type="button" onClick={() => setOpen(true)}>Modifier</button>
      {open ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !pending) setOpen(false);
        }}>
          <section className="metadata-dialog" role="dialog" aria-modal="true" aria-labelledby="product-editor-title">
            <div className="metadata-dialog-heading">
              <div><span className="eyebrow">Qualification</span><h2 id="product-editor-title">Modifier le produit</h2><p>La catégorie reste verrouillée pour préserver la checklist générée.</p></div>
              <button className="icon-button" type="button" onClick={() => setOpen(false)} disabled={pending} aria-label="Fermer"><X size={19} /></button>
            </div>
            <form className="metadata-form" onSubmit={submit}>
              <label className="field"><span><PackageCheck size={15} />Nom commercial</span><input value={name} onChange={(event) => setName(event.target.value)} required autoFocus /></label>
              <label className="field"><span><PackageCheck size={15} />Référence / SKU</span><input value={sku} onChange={(event) => setSku(event.target.value)} /></label>
              <label className="field"><span><Building2 size={15} />Fabricant</span><input value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} /></label>
              <label className="field"><span><MapPin size={15} />Pays d’origine</span><input value={originCountry} onChange={(event) => setOriginCountry(event.target.value)} /></label>
              <fieldset className="product-markets-field">
                <legend><Globe2 size={15} />Marchés de destination</legend>
                <div className="product-market-options">
                  {markets.map((market) => (
                    <label className={destinationMarkets.includes(market) ? "market-option market-option-selected" : "market-option"} key={market}>
                      <input type="checkbox" checked={destinationMarkets.includes(market)} onChange={() => toggleMarket(market)} />{market}
                    </label>
                  ))}
                </div>
              </fieldset>
              {error ? <div className="inline-message inline-message-error metadata-error" role="alert"><AlertCircle size={16} />{error}</div> : null}
              <div className="metadata-dialog-actions">
                <button className="button button-secondary" type="button" onClick={() => setOpen(false)} disabled={pending}>Annuler</button>
                <button className="button button-primary" type="submit" disabled={pending}><Save size={16} />{pending ? "Enregistrement…" : "Enregistrer"}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
