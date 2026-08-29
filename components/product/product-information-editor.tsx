"use client";

import { AlertCircle, Building2, Globe2, MapPin, PackageCheck, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useState } from "react";
import { useModalDialog } from "@/components/ui/use-modal-dialog";
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
  const closeDialog = useCallback(() => setOpen(false), []);
  const { dialogRef, triggerRef } = useModalDialog({ open, onClose: closeDialog, canClose: !pending });

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
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Votre session a expiré. Reconnectez-vous.");
      const normalizedSku = sku.trim();
      if (normalizedSku) {
        const { data: duplicate, error: duplicateError } = await supabase.from("products").select("id").eq("org_id", persistence.organizationId).eq("sku", normalizedSku).neq("id", persistence.productId).limit(1).maybeSingle();
        if (duplicateError) throw duplicateError;
        if (duplicate) throw new Error("Cette référence / SKU est déjà utilisée par un autre produit.");
      }
      const update = {
        name: name.trim(),
        sku: normalizedSku || null,
        manufacturer_name: manufacturer.trim() || null,
        origin_country: originCountry.trim() || null,
        target_markets: destinationMarkets,
        updated_at: new Date().toISOString(),
      };
      const { data: updatedProduct, error: updateError } = await supabase
        .from("products").update(update).eq("id", persistence.productId).eq("org_id", persistence.organizationId).select("id").single();
      if (updateError || !updatedProduct) throw new Error(`Le produit n’a pas pu être mis à jour : ${updateError?.message ?? "accès refusé"}`);
      await supabase.from("audit_events").insert({
        org_id: persistence.organizationId,
        user_id: user.id,
        entity_type: "product",
        entity_id: persistence.productId,
        action: "Informations produit mises à jour",
        payload: { fields: Object.keys(update) },
      });
      closeDialog();
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Le produit n’a pas pu être mis à jour.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button ref={triggerRef} className="text-link" type="button" onClick={() => setOpen(true)}>Modifier</button>
      {open ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !pending) setOpen(false);
        }}>
          <section ref={dialogRef} tabIndex={-1} className="metadata-dialog" role="dialog" aria-modal="true" aria-labelledby="product-editor-title">
            <div className="metadata-dialog-heading">
              <div><span className="eyebrow">Qualification</span><h2 id="product-editor-title">Modifier le produit</h2><p>La catégorie reste verrouillée pour préserver la checklist générée.</p></div>
              <button className="icon-button" type="button" onClick={closeDialog} disabled={pending} aria-label="Fermer"><X size={19} /></button>
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
                <button className="button button-secondary" type="button" onClick={closeDialog} disabled={pending}>Annuler</button>
                <button className="button button-primary" type="submit" disabled={pending}><Save size={16} />{pending ? "Enregistrement…" : "Enregistrer"}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
