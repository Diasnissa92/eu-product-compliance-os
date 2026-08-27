import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  Globe2,
  MapPin,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RegulatoryReportActions } from "@/components/product/regulatory-report-actions";
import { BrandMark } from "@/components/brand-mark";
import { StatusPill } from "@/components/status-pill";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { getWorkspaceProduct } from "@/lib/data/products";
import { buildRegulatoryReportSummary, documentStatusCopy, requirementStatusCopy } from "@/lib/report";
import type { RegulatoryReportPdfData } from "@/lib/report-pdf";
import { complianceStatusCopy } from "@/lib/status";

const severityCopy = {
  low: "Secondaire",
  medium: "Important",
  high: "Élevé",
  blocking: "Bloquant",
} as const;

export default async function RegulatoryReportPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const workspace = await getWorkspaceContext();
  const product = await getWorkspaceProduct(workspace, productId);
  if (!product) notFound();

  const summary = buildRegulatoryReportSummary(product);
  const generatedAt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());
  const pdfReport: RegulatoryReportPdfData = {
    productName: product.name,
    sku: product.sku,
    category: product.category,
    manufacturer: product.manufacturer,
    originCountry: product.originCountry,
    destinationMarkets: product.destinationMarkets,
    frameworks: product.frameworks,
    organizationName: workspace.organizationName,
    generatedAt,
    generatedBy: workspace.userName,
    updatedAt: product.updatedAt,
    score: product.score,
    status: complianceStatusCopy[product.status].label,
    closedRequirements: summary.closedRequirements,
    totalRequirements: summary.totalRequirements,
    verifiedDocuments: summary.verifiedDocuments,
    totalDocuments: summary.totalDocuments,
    nextDeadline: product.nextDeadline ?? "Aucune",
    requirements: product.requirements.map((requirement) => ({
      title: requirement.title,
      regulation: requirement.sourceReference
        ? `${requirement.regulation} — ${requirement.sourceReference}`
        : requirement.regulation,
      severity: severityCopy[requirement.severity],
      status: requirementStatusCopy[requirement.status],
      evidence: requirement.evidenceDocumentName ?? "Aucune",
    })),
    documents: product.documents.map((document) => ({
      name: document.name,
      type: document.type,
      status: documentStatusCopy[document.status],
      uploadedAt: document.uploadedAt,
      expiresAt: document.expiresAt ?? "Non renseignée",
    })),
  };

  return (
    <main className="report-shell">
      <div className="report-screen-toolbar report-screen-only">
        <Link className="back-link" href={`/products/${product.id}`}><ArrowLeft size={16} />Retour au dossier</Link>
        <RegulatoryReportActions report={pdfReport} />
      </div>

      <article className="regulatory-report">
        <header className="report-header">
          <div className="report-brand">
            <span><BrandMark size={24} /></span>
            <div><strong>EU Compliance</strong><small>Product OS</small></div>
          </div>
          <div className="report-confidentiality"><ShieldCheck size={14} />Fiche interne sécurisée</div>
        </header>

        <section className="report-title-section">
          <div>
            <span className="eyebrow">Fiche réglementaire produit</span>
            <h1>{product.name}</h1>
            <p>{product.sku} · {product.category}</p>
          </div>
          <div className="report-title-status">
            <StatusPill status={product.status} />
            <strong>{product.score}%</strong>
            <small>Score du dossier</small>
          </div>
        </section>

        <section className="report-metadata">
          <div><small>Organisation</small><strong>{workspace.organizationName}</strong></div>
          <div><small>Édité le</small><strong>{generatedAt}</strong></div>
          <div><small>Édité par</small><strong>{workspace.userName}</strong></div>
          <div><small>Dernière mise à jour</small><strong>{product.updatedAt}</strong></div>
        </section>

        <section className="report-summary-grid" aria-label="Synthèse du dossier">
          <div><CheckCircle2 size={19} /><span><strong>{summary.closedRequirements}/{summary.totalRequirements}</strong><small>Exigences clôturées</small></span></div>
          <div><FileCheck2 size={19} /><span><strong>{summary.verifiedDocuments}/{summary.totalDocuments}</strong><small>Documents vérifiés</small></span></div>
          <div><CalendarClock size={19} /><span><strong>{product.nextDeadline ?? "Aucune"}</strong><small>Prochaine échéance</small></span></div>
        </section>

        <section className="report-section">
          <div className="report-section-heading"><span>01</span><div><small>Identification</small><h2>Informations produit</h2></div></div>
          <dl className="report-product-grid">
            <div><dt><Building2 size={15} />Fabricant</dt><dd>{product.manufacturer}</dd></div>
            <div><dt><MapPin size={15} />Pays d’origine</dt><dd>{product.originCountry}</dd></div>
            <div><dt><Globe2 size={15} />Marchés de destination</dt><dd>{product.destinationMarkets.join(", ") || "À préciser"}</dd></div>
            <div><dt><PackageCheck size={15} />Catégorie</dt><dd>{product.category}</dd></div>
          </dl>
          <div className="report-frameworks">
            <small>Référentiels identifiés</small>
            <div>{product.frameworks.map((framework) => <span key={framework}>{framework}</span>)}</div>
          </div>
        </section>

        <section className="report-section">
          <div className="report-section-heading"><span>02</span><div><small>Diagnostic</small><h2>Checklist de conformité</h2></div></div>
          <div className="report-table-wrap">
            <table className="report-table">
              <thead><tr><th>Exigence</th><th>Référence</th><th>Niveau</th><th>Statut</th><th>Preuve liée</th></tr></thead>
              <tbody>
                {product.requirements.map((requirement) => (
                  <tr key={requirement.id}>
                    <td><strong>{requirement.title}</strong></td>
                    <td>
                      <strong>{requirement.regulation}</strong>
                      {requirement.sourceReference || requirement.regulationTitle ? (
                        <small>{requirement.sourceReference ?? requirement.regulationTitle}</small>
                      ) : null}
                    </td>
                    <td>{severityCopy[requirement.severity]}</td>
                    <td><span className={`report-state report-state-${requirement.status}`}>{requirementStatusCopy[requirement.status]}</span></td>
                    <td>{requirement.evidenceDocumentName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {product.requirements.length === 0 ? <p className="report-empty">Aucune exigence n’est encore enregistrée.</p> : null}
        </section>

        <section className="report-section">
          <div className="report-section-heading"><span>03</span><div><small>Coffre de preuves</small><h2>Documents réglementaires</h2></div></div>
          <div className="report-table-wrap">
            <table className="report-table">
              <thead><tr><th>Document</th><th>Type</th><th>Statut</th><th>Ajout</th><th>Expiration</th></tr></thead>
              <tbody>
                {product.documents.map((document) => (
                  <tr key={document.id}>
                    <td><strong>{document.name}</strong></td>
                    <td>{document.type}</td>
                    <td><span className={`report-state report-state-${document.status}`}>{documentStatusCopy[document.status]}</span></td>
                    <td>{document.uploadedAt}</td>
                    <td>{document.expiresAt ?? "Non renseignée"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {product.documents.length === 0 ? <p className="report-empty">Aucun document n’est encore enregistré.</p> : null}
        </section>

        <footer className="report-footer">
          <div><ShieldCheck size={18} /><p><strong>Traçabilité protégée</strong><br />Cette fiche est générée à partir des données accessibles à l’organisation {workspace.organizationName}.</p></div>
          <p>Document de synthèse — ne constitue ni une certification, ni un avis juridique, ni la décision d’un organisme notifié.</p>
        </footer>
      </article>
    </main>
  );
}
