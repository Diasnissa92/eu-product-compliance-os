"use client";

import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, useState } from "react";
import { downloadBlob } from "@/lib/client-actions";
import type { ProductImportRecord } from "@/lib/professional";
import { parseProductCsv, productImportTemplate, type ProductImportPreview } from "@/lib/product-import";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";

type Persistence = { organizationId: string };
type ImportResult = { created: number; skipped: number; errors: Array<{ row: number; sku?: string; message: string }> };

function parseResult(value: Json): ImportResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { created: 0, skipped: 0, errors: [] };
  const result = value as Record<string, Json | undefined>;
  const errors = Array.isArray(result.errors) ? result.errors.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    return [{ row: typeof item.row === "number" ? item.row : 0, sku: typeof item.sku === "string" ? item.sku : undefined, message: typeof item.message === "string" ? item.message : "Erreur inconnue" }];
  }) : [];
  return { created: typeof result.created === "number" ? result.created : 0, skipped: typeof result.skipped === "number" ? result.skipped : 0, errors };
}

export function ProductImporter({ history, persistence }: { history: ProductImportRecord[]; persistence?: Persistence }) {
  const router = useRouter();
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ProductImportPreview>();
  const [result, setResult] = useState<ImportResult>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  function downloadTemplate() {
    downloadBlob(new Blob([`\uFEFF${productImportTemplate}`], { type: "text/csv;charset=utf-8" }), "modele-import-produits.csv");
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    setError(undefined); setResult(undefined);
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) { setError("Le fichier dépasse 2 Mo."); return; }
    const content = await file.text();
    setFileName(file.name);
    setPreview(parseProductCsv(content));
  }

  async function importRows() {
    if (!preview?.rows.length) return;
    setSaving(true); setError(undefined);
    try {
      if (!persistence) {
        setResult({ created: preview.rows.length, skipped: 0, errors: [] });
      } else {
        const { data, error: rpcError } = await createClient().rpc("import_products", { p_org_id: persistence.organizationId, p_file_name: fileName || "import.csv", p_rows: preview.rows as unknown as Json });
        if (rpcError) throw rpcError;
        setResult(parseResult(data));
      }
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "L’import n’a pas pu être terminé."); }
    finally { setSaving(false); }
  }

  return <div className="professional-stack">
    <section className="panel import-panel"><div className="import-intro"><span className="feature-icon feature-icon-mint"><FileSpreadsheet size={23} /></span><div><span className="eyebrow">Import contrôlé</span><h2>Ajouter jusqu’à 100 produits en une fois</h2><p>Le fichier est analysé avant écriture. Les doublons de SKU sont ignorés et chaque produit reçoit automatiquement sa checklist réglementaire.</p></div></div><div className="import-actions"><button className="button button-secondary" type="button" onClick={downloadTemplate}><Download size={17} />Télécharger le modèle</button><label className="button button-primary file-button"><Upload size={17} />Choisir un CSV<input type="file" accept=".csv,text/csv" onChange={chooseFile} /></label></div></section>
    {preview ? <section className="panel import-preview"><div className="professional-panel-heading compact"><div><span className="eyebrow">Prévisualisation</span><h2>{fileName}</h2><p>{preview.rows.length} ligne{preview.rows.length > 1 ? "s" : ""} valide{preview.rows.length > 1 ? "s" : ""} détectée{preview.rows.length > 1 ? "s" : ""}</p></div><button className="button button-primary" disabled={saving || preview.rows.length === 0} onClick={importRows}><Upload size={17} />{saving ? "Import…" : `Importer ${preview.rows.length} produit${preview.rows.length > 1 ? "s" : ""}`}</button></div>{preview.errors.length ? <div className="import-errors"><AlertTriangle size={18} /><div><strong>{preview.errors.length} avertissement{preview.errors.length > 1 ? "s" : ""}</strong>{preview.errors.map((item) => <p key={`${item.row}-${item.message}`}>Ligne {item.row} : {item.message}</p>)}</div></div> : null}<div className="table-scroll"><table className="import-table"><thead><tr><th>Nom</th><th>SKU</th><th>Catégorie</th><th>Fabricant</th><th>Origine</th><th>Marchés</th></tr></thead><tbody>{preview.rows.slice(0, 20).map((row, index) => <tr key={`${row.sku}-${index}`}><td><strong>{row.name}</strong></td><td>{row.sku}</td><td>{row.category || "À préciser"}</td><td>{row.manufacturer || "À préciser"}</td><td>{row.originCountry || "À préciser"}</td><td>{row.targetMarkets.join(", ") || "À préciser"}</td></tr>)}</tbody></table></div>{preview.rows.length > 20 ? <p className="table-footnote">20 premières lignes affichées sur {preview.rows.length}.</p> : null}</section> : null}
    {result ? <section className="import-result" role="status"><CheckCircle2 size={25} /><div><strong>Import terminé</strong><p>{result.created} produit{result.created > 1 ? "s" : ""} créé{result.created > 1 ? "s" : ""}, {result.skipped} ligne{result.skipped > 1 ? "s" : ""} ignorée{result.skipped > 1 ? "s" : ""}.</p>{result.errors.map((item) => <small key={`${item.row}-${item.message}`}>Ligne {item.row}{item.sku ? ` · ${item.sku}` : ""} : {item.message}</small>)}</div></section> : null}
    {error ? <p className="form-feedback form-feedback-error" role="alert">{error}</p> : null}
    <section className="panel professional-list-panel"><div className="professional-panel-heading compact"><div><span className="eyebrow">Traçabilité</span><h2>Historique des imports</h2></div><span className="professional-count">{history.length}</span></div>{history.length ? <div className="professional-list">{history.map((item) => <article className="professional-row" key={item.id}><span className="feature-icon feature-icon-mint"><FileSpreadsheet size={18} /></span><div className="professional-row-copy"><strong>{item.fileName}</strong><p>{item.createdRows} créé{item.createdRows > 1 ? "s" : ""} · {item.skippedRows} ignoré{item.skippedRows > 1 ? "s" : ""}</p><small>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</small></div></article>)}</div> : <div className="empty-state"><FileSpreadsheet size={29} /><strong>Aucun import</strong><p>Les opérations groupées apparaîtront ici.</p></div>}</section>
  </div>;
}

