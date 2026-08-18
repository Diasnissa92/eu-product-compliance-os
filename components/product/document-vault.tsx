"use client";

import { AlertCircle, CheckCircle2, Download, File, FileSearch, MoreHorizontal, Plus, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ProductDocument } from "@/lib/types";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const allowedMimeTypes: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

type PersistenceContext = { organizationId: string; productId: string };

function extensionOf(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function documentType(fileName: string) {
  const extension = extensionOf(fileName);
  if (extension === "pdf") return "PDF";
  if (["doc", "docx"].includes(extension)) return "Document Word";
  if (["xls", "xlsx"].includes(extension)) return "Tableur Excel";
  if (["jpg", "jpeg", "png", "webp"].includes(extension)) return "Image";
  return "À classifier";
}

function displaySize(size: number) {
  return size > 1_000_000 ? `${(size / 1_000_000).toFixed(1)} Mo` : `${Math.max(1, Math.ceil(size / 1000))} Ko`;
}

function safeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "document";
}

export function DocumentVault({ documents, persistence }: { documents: ProductDocument[]; persistence?: PersistenceContext }) {
  const router = useRouter();
  const [localDocuments, setLocalDocuments] = useState(documents);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file?: File) {
    if (!file) return;
    setMessage(null);
    setError(null);

    const extension = extensionOf(file.name);
    const contentType = allowedMimeTypes[extension];
    if (!contentType) {
      setError("Format non accepté. Utilisez un PDF, Word, Excel, JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Ce fichier dépasse la limite de 25 Mo.");
      return;
    }

    if (!persistence) {
      setLocalDocuments((current) => [
        {
          id: `local-${file.name}-${file.size}`,
          name: file.name,
          type: documentType(file.name),
          status: "review",
          uploadedAt: "À l’instant",
          size: displaySize(file.size),
        },
        ...current,
      ]);
      setMessage(`${file.name} a été ajouté en mode démonstration.`);
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError("Votre session a expiré. Reconnectez-vous avant d’ajouter un document.");
      setUploading(false);
      return;
    }

    const filePath = `${persistence.organizationId}/${persistence.productId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from("compliance-documents")
      .upload(filePath, file, { cacheControl: "3600", contentType, upsert: false });

    if (uploadError) {
      setError(`Le fichier n’a pas pu être envoyé : ${uploadError.message}`);
      setUploading(false);
      return;
    }

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
      setError(`Le document n’a pas pu être enregistré : ${documentError?.message ?? "erreur inconnue"}`);
      setUploading(false);
      return;
    }

    await supabase.from("audit_events").insert({
      org_id: persistence.organizationId,
      user_id: user.id,
      entity_type: "document",
      entity_id: persistence.productId,
      action: "Preuve documentaire ajoutée",
      payload: { product_id: persistence.productId, document_id: documentRow.id, file_name: file.name },
    });

    setLocalDocuments((current) => [
      {
        id: documentRow.id,
        name: file.name,
        type: documentType(file.name),
        status: "review",
        uploadedAt: "À l’instant",
        size: displaySize(file.size),
        filePath,
      },
      ...current,
    ]);
    setMessage(`${file.name} est enregistré dans le coffre sécurisé.`);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function downloadDocument(document: ProductDocument) {
    if (!document.filePath) return;
    setError(null);
    setDownloadingId(document.id);
    const { data, error: downloadError } = await createClient().storage
      .from("compliance-documents")
      .download(document.filePath);

    if (downloadError || !data) {
      setError(`Le téléchargement a échoué : ${downloadError?.message ?? "erreur inconnue"}`);
      setDownloadingId(undefined);
      return;
    }

    const objectUrl = URL.createObjectURL(data);
    const link = window.document.createElement("a");
    link.href = objectUrl;
    link.download = document.name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    setDownloadingId(undefined);
  }

  return (
    <div>
      <input
        className="sr-only"
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
        disabled={uploading}
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <div className="document-toolbar">
        <div><strong>{localDocuments.length} documents</strong><span> · {localDocuments.filter((doc) => doc.status === "verified").length} vérifiés</span></div>
        <button className="button button-primary button-small" type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>
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
              {document.status === "verified" ? "Vérifié" : document.status === "review" ? "En analyse" : "Expiré"}
            </span>
            {document.filePath ? (
              <button className="icon-button" type="button" disabled={downloadingId === document.id} onClick={() => void downloadDocument(document)} aria-label={`Télécharger ${document.name}`}>
                <Download size={18} />
              </button>
            ) : <button className="icon-button" type="button" aria-label={`Actions pour ${document.name}`}><MoreHorizontal size={18} /></button>}
          </article>
        ))}
      </div>

      <button
        className="document-dropzone"
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
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
