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
import { getProductRegulatorySnapshot } from "@/lib/data/regulatory-phase3";
import { getWorkspaceTeam } from "@/lib/data/team";
import { buildRegulatoryReportSummary, documentStatusCopy, requirementStatusCopy } from "@/lib/report";
import type { RegulatoryReportPdfData } from "@/lib/report-pdf";
import { complianceStatusCopy } from "@/lib/status";

const severityCopy = {
  low: "Secondaire",
  medium: "Important",
  high: "Élevé",
  blocking: "Bloquant",
} as const;

const assessmentOutcomeCopy = {
  applicable: "Applicable à confirmer dans le dossier",
  not_applicable: "Non applicable selon les faits enregistrés",
  needs_information: "Information manquante",
  human_review: "Revue humaine requise",
} as const;

const regulatoryActionStatusCopy = {
  open: "Ouverte",
  in_progress: "En cours",
  done: "Terminée",
  dismissed: "Écartée",
} as const;

function formatDate(value?: string) {
  if (!value) return "Non définie";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export default async function RegulatoryReportPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const workspace = await getWorkspaceContext();
  const [product, snapshot, team] = await Promise.all([
    getWorkspaceProduct(workspace, productId),
    getProductRegulatorySnapshot(workspace, productId),
    getWorkspaceTeam(workspace),
  ]);
  if (!product) notFound();

  const summary = buildRegulatoryReportSummary(product);
  const teamNames = new Map(team.map((member) => [member.userId, member.fullName]));
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
    engineVersion: snapshot.engineVersion,
    regulatoryAssessments: snapshot.assessments.map((assessment) => ({
      regulation: assessment.regulationCode,
      outcome: assessmentOutcomeCopy[assessment.outcome],
      rationale: assessment.rationale,
      sourceReference: assessment.sourceReference,
    })),
    regulatoryActions: snapshot.actions.map((action) => ({
      title: action.title,
      regulation: action.regulationCode,
      severity: severityCopy[action.severity],
      status: regulatoryActionStatusCopy[action.status],
      owner: action.assigneeId ? teamNames.get(action.assigneeId) ?? "Membre de l’organisation" : "Non assigné",
      dueDate: formatDate(action.dueDate),
    })),
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

  const openRegulatoryActions = snapshot.actions.filter((action) => action.status === "open" || action.status === "in_progress").length;

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
            <small>Score des exigences matérialisées</small>
          </div>
        </section>

        <section className="report-metadata">
          <div><small>Organisation</small><strong>{workspace.organizationName}</strong></div>
          <div><small>Édité le</small><strong>{generatedAt}</strong></div>
          <div><small>Édité par</small><strong>{workspace.userName}</strong></div>
          <div><small>Moteur de qualification</small><strong>{snapshot.engineVersion}</strong></div>
        </section>

        <section className="report-summary-grid" aria-label="Synthèse du dossier">
          <div><CheckCircle2 size={19} /><span><strong>{snapshot.assessments.length}</strong><small>Cadres évalués</small></span></div>
          <div><CalendarClock size={19} /><span><strong>{openRegulatoryActions}</strong><small>Actions de qualification ouvertes</small></span></div>
          <div><FileCheck2 size={19} /><span><strong>{summary.verifiedDocuments}/{summary.totalDocuments}</strong><small>Documents vérifiés</small></span></div>
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
            <small>Référentiels matérialisés</small>
            <div>{product.frameworks.length ? product.frameworks.map((framework) => <span key={framework}>{framework}</span>) : <span>Aucun</span>}</div>
          </div>
        </section>

        <section className="report-section">
          <div className="report-section-heading"><span>02</span><div><small>Qualification versionnée</small><h2>Évaluation réglementaire</h2></div></div>
          <p className="report-empty">Version utilisée : <strong>{snapshot.engineVersion}</strong>. Les conclusions ci-dessous documentent une qualification ; elles ne valent pas certification automatique.</p>
          <div className="report-table-wrap">
            <table className="report-table">
              <thead><tr><th>Cadre</th><th>Conclusion</th><th>Justification</th><th>Source</th></tr></thead>
              <tbody>
                {snapshot.assessments.map((assessment) => <tr key={assessment.regulationCode}>
                  <td><strong>{assessment.regulationCode}</strong></td>
                  <td>{assessmentOutcomeCopy[assessment.outcome]}</td>
                  <td>{assessment.rationale}</td>
                  <td>{assessment.sourceReference}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {snapshot.assessments.length === 0 ? <p className="report-empty">Aucune qualification n’est encore enregistrée pour cette version du moteur.</p> : null}
        </section>

        <section className="report-section">
          <div className="report-section-heading"><span>03</span><div><small>Collaboration</small><h2>Plan d’actions réglementaires</h2></div></div>
          <div className="report-table-wrap">
            <table className="report-table">
              <thead><tr><th>Action</th><th>Cadre</th><th>Niveau</th><th>Statut</th><th>Responsable / échéance</th></tr></thead>
              <tbody>
                {snapshot.actions.map((action) => <tr key={action.id}>
                  <td><strong>{action.title}</strong></td>
                  <td>{action.regulationCode}<small>{action.sourceReference}</small></td>
                  <td>{severityCopy[action.severity]}</td>
                  <td>{regulatoryActionStatusCopy[action.status]}</td>
                  <td>{action.assigneeId ? teamNames.get(action.assigneeId) ?? "Membre de l’organisation" : "Non assigné"}<small>{formatDate(action.dueDate)}</small></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {snapshot.actions.length === 0 ? <p className="report-empty">Aucune action de qualification n’est enregistrée.</p> : null}
        </section>

        <section className="report-section">
          <div className="report-section-heading"><span>04</span><div><small>Exigences matérialisées</small><h2>Checklist de conformité</h2></div></div>
          <div className="report-table-wrap">
            <table className="report-table">
              <thead><tr><th>Exigence</th><th>Référence</th><th>Niveau</th><th>Statut</th><th>Preuve liée</th></tr></thead>
              <tbody>
                {product.requirements.map((requirement) => (
                  <tr key={requirement.id}>
                    <td><strong>{requirement.title}</strong></td>
                    <td>
                      <strong>{requirement.regulation}</strong>
                      {requirement.sourceReference || requirement.regulationTitle ? <small>{requirement.sourceReference ?? requirement.regulationTitle}</small> : null}
                    </td>
                    <td>{severityCopy[requirement.severity]}</td>
                    <td><span className={`report-state report-state-${requirement.status}`}>{requirementStatusCopy[requirement.status]}</span></td>
                    <td>{requirement.evidenceDocumentName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {product.requirements.length === 0 ? <p className="report-empty">Aucune exigence active n’est matérialisée. Cela ne signifie pas qu’aucun texte ne s’applique : voir la qualification ci-dessus.</p> : null}
        </section>

        <section className="report-section">
          <div className="report-section-heading"><span>05</span><div><small>Coffre de preuves</small><h2>Documents réglementaires</h2></div></div>
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
          <div><ShieldCheck size={18} /><p><strong>Traçabilité protégée</strong><br />Cette fiche est générée à partir des données accessibles à l’organisation {workspace.organizationName} et de l’évaluation {snapshot.engineVersion}.</p></div>
          <p>Document de synthèse — ne constitue ni une certification, ni un avis juridique, ni la décision d’un organisme notifié.</p>
        </footer>
      </article>
    </main>
  );
}
