"use client";

import { AlertCircle, CheckCircle2, Download, File, FileSearch, Plus, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { DocumentAnalysisAction } from "@/components/document/document-analysis-action";
import { downloadBlob } from "@/lib/client-actions";
import { documentExtension, safeDocumentFileName, validateDocumentFile } from "@/lib/document-files";
import { createClient } from "@/lib/supabase/client";
import type { PersistenceContext, ProductDocument } from "@/lib/types";

function documentType(fileName: string) {
  const extension = documentExtension(fileName);
  if (extension === "pdf") return "PDF";
  if (["doc", "docx"].includes(extension)) return "Document Word";
  if (["xls", "xlsx"].includes(extension)) return "Tableur Excel";
  if (["jpg", "jpeg", "png", "webp"].includes(extension)) return "Image";
  return "À classifier";
}

function displaySize(size: number) {
  return size > 1_000_000 ? `${(size / 1_000_000).toFixed(1)} Mo` : `${Math.max(1, Math.ceil(size / 1000))} Ko`;
}

export function DocumentVault({
  documents,
  persistence,
  canAnalyze = true,
  canApply = true,
}: {
  documents: ProductDocument[];
  persistence?: PersistenceContext;
  canAnalyze?: boolean;
  canApply?: boolean;
}) {
  const router = useRouter();
  const [localDocuments, setLocalDocuments] = useState(documents);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file?: File) {
    if (!file) return;
    if (!canApply) {
      setError("Votre rôle ne permet pas d’ajouter ou de modifier des documents.");
      return;
    }
    setMessage(null);
    setError(null);

    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      setError(validation.error);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const contentType = validation.contentType;

    if (!persistence) {
      setLocalDocuments((current) => [
        {
          id: `local-${file.name}-${file.size}`,
          name: file.name,
          type: documentType(file.name),
          status: "review",
          uploadedAt: "À l’instant",
          size: displaySize(file.size),
          mimeType: contentType,
        },
        ...current,
      ]);
      setMessage(`${file.name} a été ajouté en mode démonstration.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Votre session a expiré. Reconnectez-vous avant d’ajouter un document.");
      const filePath = `${persistence.organizationId}/${persistence.productId}/${crypto.randomUUID()}-${safeDocumentFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("compliance-documents")
        .upload(filePath, file, { cacheControl: "3600", contentType, upsert: false });
      if (uploadError) throw new Error(`Le fichier n’a pas pu être envoyé : ${uploadError.message}`);

      const { data: documentRow, error: documentError } = await supabase
        .from("documents")
        .insert({
          org_id: persistence.organizationId,
          product_id: persistence.productId,
          uploaded_by: user.id,
          title: file.name,
          document_type: documentType(file.name),
          file_path: filePath,
          status: "uploaded",
          metadata: { original_name: file.name, size: file.size, mime_type: contentType },
        })
        .select("id")
        .single();
      if (documentError || !documentRow) {
        await supabase.storage.from("compliance-documents").remove([filePath]);
        throw new Error(`Le document n’a pas pu être enregistré : ${documentError?.message ?? "erreur inconnue"}`);
      }
      await supabase.from("audit_events").insert({
        org_id: persistence.organizationId,
        user_id: user.id,
        entity_type: "document",
        entity_id: persistence.productId,
        action: "Preuve documentaire ajoutée",
        payload: { product_id: persistence.productId, document_id: documentRow.id, file_name: file.name },
      });
      setLocalDocuments((current) => [{
        id: documentRow.id,
        name: file.name,
        type: documentType(file.name),
        status: "review",
        uploadedAt: "À l’instant",
        size: displaySize(file.size),
        filePath,
        mimeType: contentType,
      }, ...current]);
      setMessage(`${file.name} est enregistré dans le coffre sécurisé.`);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Le document n’a pas pu être enregistré.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function downloadDocument(document: ProductDocument) {
    if (!document.filePath) return;
    setError(null);
    setDownloadingId(document.id);
    try {
      const { data, error: downloadError } = await createClient().storage
        .from("compliance-documents")
        .download(document.filePath);
      if (downloadError || !data) throw new Error(downloadError?.message ?? "erreur inconnue");
      downloadBlob(data, document.name);
    } catch (caughtError) {
      setError(`Le téléchargement a échoué : ${caughtError instanceof Error ? caughtError.message : "erreur inconnue"}`);
    } finally {
      setDownloadingId(undefined);
    }
  }

  return (
    <div>
      <input
        className="sr-only"
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
        disabled={uploading || !canApply}
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <div className="document-toolbar">
        <div><strong>{localDocuments.length} documents</strong><span> · {localDocuments.filter((doc) => doc.status === "verified").length} vérifiés</span></div>
        <button className="button button-primary button-small" type="button" disabled={uploading || !canApply} onClick={() => inputRef.current?.click()}>
          <Upload size={16} />{uploading ? "Envoi…" : "Ajouter une preuve"}
        </button>
      </div>

      {message ? <div className="inline-message" aria-live="polite"><CheckCircle2 size={16} />{message}</div> : null}
      {error ? <div className="inline-message inline-message-error" role="alert"><AlertCircle size={16} />{error}</div> : null}

      <div className="document-list">
        {localDocuments.map((document) => (
          <article className="document-row" key={document.id}>
            <span className={`file-icon file-${document.status}`}>
              {document.status === "review" ? <FileSearch size={20} /> : <File size={20} />}
            </span>
            <span className="document-name">
              <strong>{document.name}</strong>
              <small>{document.type} · {document.size}</small>
            </span>
            <span className="document-date"><small>Ajouté</small><strong>{document.uploadedAt}</strong></span>
            <span className="document-date"><small>Expiration</small><strong>{document.expiresAt ?? "—"}</strong></span>
            <span className={`document-status document-${document.status}`}>
              {document.status === "verified"
                ? "Vérifié"
                : document.status === "review"
                  ? "En analyse"
                  : document.status === "rejected"
                    ? "Refusé"
                    : "Expiré"}
            </span>
            <DocumentAnalysisAction
              document={document}
              persistence={persistence}
              canAnalyze={canAnalyze}
              canApply={canApply}
              onUpdated={(updated) => setLocalDocuments((current) => current.map((item) => item.id === updated.id ? updated : item))}
            />
            {document.filePath ? (
              <button className="icon-button" type="button" disabled={downloadingId === document.id} onClick={() => void downloadDocument(document)} aria-label={`Télécharger ${document.name}`}>
                <Download size={18} />
              </button>
            ) : <span className="document-no-file" title="Fichier de démonstration non téléchargeable">—</span>}
          </article>
        ))}
      </div>

      <button
        className={`document-dropzone ${dragging ? "document-dropzone-active" : ""}`}
        type="button"
        disabled={uploading || !canApply}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handleFile(event.dataTransfer.files[0]);
        }}
      >
        <span><Plus size={18} /></span>
        {uploading ? "Enregistrement sécurisé en cours…" : "Déposer un document supplémentaire"}
        <small>PDF, Word, Excel ou image · 25 Mo maximum</small>
      </button>
    </div>
  );
}
