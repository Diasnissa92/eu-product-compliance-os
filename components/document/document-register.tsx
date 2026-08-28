"use client";

import {
  ArrowUpDown,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Download,
  File,
  FileSearch,
  Filter,
  Pencil,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import { DocumentAnalysisAction } from "@/components/document/document-analysis-action";
import { DocumentMetadataDialog } from "@/components/document/document-metadata-dialog";
import { createClient } from "@/lib/supabase/client";
import type { PortfolioDocument, ProductDocument } from "@/lib/types";

type DocumentFilter = "all" | ProductDocument["status"];
type DocumentSort = "recent" | "expiry" | "product";

const filters: Array<{ value: DocumentFilter; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "verified", label: "Vérifiés" },
  { value: "review", label: "En analyse" },
  { value: "rejected", label: "Refusés" },
  { value: "expired", label: "Expirés" },
];

const statusCopy: Record<ProductDocument["status"], string> = {
  verified: "Vérifié",
  review: "En analyse",
  rejected: "Refusé",
  expired: "Expiré",
};

function expiryState(document: PortfolioDocument) {
  if (!document.expiresOn) return { label: "Non renseignée", tone: "neutral" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${document.expiresOn}T00:00:00`);
  const days = Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { label: `Expiré depuis ${Math.abs(days)} j`, tone: "danger" };
  if (days === 0) return { label: "Expire aujourd’hui", tone: "danger" };
  if (days <= 30) return { label: `Expire dans ${days} j`, tone: "warning" };
  return { label: document.expiresAt ?? "Date renseignée", tone: "safe" };
}

export function DocumentRegister({
  documents,
  initialEditId,
  canAnalyze = true,
  canApply = true,
}: {
  documents: PortfolioDocument[];
  initialEditId?: string;
  canAnalyze?: boolean;
  canApply?: boolean;
}) {
  const router = useRouter();
  const [localDocuments, setLocalDocuments] = useState(documents);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DocumentFilter>("all");
  const [sort, setSort] = useState<DocumentSort>("recent");
  const [downloadingId, setDownloadingId] = useState<string>();
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [editingDocument, setEditingDocument] = useState<PortfolioDocument | undefined>(() =>
    initialEditId ? documents.find((document) => document.id === initialEditId) : undefined,
  );
  const deferredQuery = useDeferredValue(query);

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLocaleLowerCase("fr");
    const result = localDocuments.filter((document) => {
      const matchesFilter = filter === "all" || document.status === filter;
      const matchesQuery = normalizedQuery.length === 0 || [
        document.name,
        document.type,
        document.productName,
        document.productSku,
        document.productCategory,
        document.issuingBody,
      ].filter(Boolean).join(" ").toLocaleLowerCase("fr").includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });

    return result.toSorted((left, right) => {
      if (sort === "product") return left.productName.localeCompare(right.productName, "fr");
      if (sort === "expiry") {
        if (!left.expiresOn) return 1;
        if (!right.expiresOn) return -1;
        return left.expiresOn.localeCompare(right.expiresOn);
      }
      return right.createdAt.localeCompare(left.createdAt);
    });
  }, [deferredQuery, filter, localDocuments, sort]);

  function saveMetadata(updatedDocument: PortfolioDocument) {
    setLocalDocuments((current) => current.map((document) => document.id === updatedDocument.id ? updatedDocument : document));
    setEditingDocument(undefined);
    setMessage(`Les informations de ${updatedDocument.name} sont enregistrées.`);
    if (initialEditId) router.replace("/documents", { scroll: false });
    else router.refresh();
  }

  function closeMetadata() {
    setEditingDocument(undefined);
    if (initialEditId) router.replace("/documents", { scroll: false });
  }

  async function downloadDocument(document: PortfolioDocument) {
    if (!document.filePath) return;
    setError(undefined);
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
    <div className="document-register">
      <div className="document-register-toolbar">
        <label className="search-field">
          <Search size={18} />
          <span className="sr-only">Rechercher un document</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher par document, produit ou référence…"
          />
        </label>
        <label className="sort-field">
          <ArrowUpDown size={16} />
          <span className="sr-only">Trier les documents</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as DocumentSort)}>
            <option value="recent">Plus récents</option>
            <option value="expiry">Expiration proche</option>
            <option value="product">Nom du produit</option>
          </select>
        </label>
      </div>

      <div className="filter-tabs" role="group" aria-label="Filtrer les documents par statut">
        {filters.map((item) => (
          <button
            className={filter === item.value ? "filter-tab filter-tab-active" : "filter-tab"}
            type="button"
            key={item.value}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
            <span>{item.value === "all" ? localDocuments.length : localDocuments.filter((document) => document.status === item.value).length}</span>
          </button>
        ))}
      </div>

      {message ? <div className="inline-message document-register-error" aria-live="polite"><CheckCircle2 size={16} />{message}</div> : null}
      {error ? <div className="inline-message inline-message-error document-register-error" role="alert">{error}</div> : null}

      <div className="table-scroll">
        <table className="document-register-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Produit</th>
              <th>Statut</th>
              <th>Expiration</th>
              <th>Ajout</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {filteredDocuments.map((document) => {
              const expiry = expiryState(document);
              return (
                <tr key={`${document.productId}-${document.id}`}>
                  <td>
                    <div className="register-document-cell">
                      <span className={`file-icon file-${document.status}`}>
                        {document.status === "review" ? <FileSearch size={20} /> : <File size={20} />}
                      </span>
                      <span>
                        <strong>{document.name}</strong>
                        <small>{document.type} · {document.size}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <Link className="register-product-cell" href={`/products/${document.productId}`}>
                      <strong>{document.productName}</strong>
                      <small>{document.productSku}</small>
                    </Link>
                  </td>
                  <td>
                    <span className={`document-status document-${document.status}`}>
                      {document.status === "verified" ? <CheckCircle2 size={13} /> : null}
                      {statusCopy[document.status]}
                    </span>
                  </td>
                  <td>
                    <span className={`expiry-cell expiry-${expiry.tone}`}>
                      <CalendarClock size={14} />
                      <span><strong>{expiry.label}</strong><small>{document.expiresAt ?? "Aucune date"}</small></span>
                    </span>
                  </td>
                  <td><span className="table-muted">{document.uploadedAt}</span></td>
                  <td>
                    <span className="document-row-actions">
                      <button
                        hidden={!canApply}
                        className="icon-button"
                        type="button"
                        onClick={() => {
                          setMessage(undefined);
                          setEditingDocument(document);
                        }}
                        aria-label={`Modifier les informations de ${document.name}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <DocumentAnalysisAction
                        document={document}
                        persistence={document.organizationId ? { organizationId: document.organizationId, productId: document.productId } : undefined}
                        canAnalyze={canAnalyze}
                        canApply={canApply}
                        onUpdated={(updated) => setLocalDocuments((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item))}
                      />
                      {document.filePath ? (
                        <button
                          className="icon-button"
                          type="button"
                          disabled={downloadingId === document.id}
                          onClick={() => void downloadDocument(document)}
                          aria-label={`Télécharger ${document.name}`}
                        >
                          <Download size={17} />
                        </button>
                      ) : null}
                      <Link className="row-link" href={`/products/${document.productId}#documents`} aria-label={`Ouvrir le dossier de ${document.productName}`}>
                        <ChevronRight size={17} />
                      </Link>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="table-empty">
          <Filter size={22} />
          <strong>Aucun document trouvé</strong>
          <p>Modifiez la recherche ou sélectionnez un autre statut.</p>
        </div>
      ) : null}

      {editingDocument ? (
        <DocumentMetadataDialog document={editingDocument} onClose={closeMetadata} onSaved={saveMetadata} />
      ) : null}
    </div>
  );
}
