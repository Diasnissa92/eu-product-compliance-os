"use client";

import { CheckCircle2, File, FileSearch, MoreHorizontal, Plus, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { ProductDocument } from "@/lib/types";

export function DocumentVault({ documents }: { documents: ProductDocument[] }) {
  const [localDocuments, setLocalDocuments] = useState(documents);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file?: File) {
    if (!file) return;
    setLocalDocuments((current) => [
      {
        id: `local-${file.name}-${file.size}`,
        name: file.name,
        type: "À classifier",
        status: "review",
        uploadedAt: "À l’instant",
        size: file.size > 1_000_000 ? `${(file.size / 1_000_000).toFixed(1)} Mo` : `${Math.ceil(file.size / 1000)} Ko`,
      },
      ...current,
    ]);
    setMessage(`${file.name} a été ajouté pour analyse.`);
  }

  return (
    <div>
      <input
        className="sr-only"
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <div className="document-toolbar">
        <div><strong>{localDocuments.length} documents</strong><span> · {localDocuments.filter((doc) => doc.status === "verified").length} vérifiés</span></div>
        <button className="button button-primary button-small" type="button" onClick={() => inputRef.current?.click()}>
          <Upload size={16} />Ajouter une preuve
        </button>
      </div>

      {message ? <div className="inline-message"><CheckCircle2 size={16} />{message}</div> : null}

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
            <button className="icon-button" type="button" aria-label={`Actions pour ${document.name}`}><MoreHorizontal size={18} /></button>
          </article>
        ))}
      </div>

      <button className="document-dropzone" type="button" onClick={() => inputRef.current?.click()}>
        <span><Plus size={18} /></span>
        Déposer un document supplémentaire
        <small>PDF, Word, Excel ou image · 25 Mo maximum</small>
      </button>
    </div>
  );
}
