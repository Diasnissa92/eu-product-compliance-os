"use client";

import {
  AlertCircle,
  BrainCircuit,
  Check,
  CheckCircle2,
  FileSearch,
  Link2,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { demoDocumentAnalysis, isAnalyzableMimeType } from "@/lib/document-analysis";
import { createClient } from "@/lib/supabase/client";
import type { DocumentAnalysis, PersistenceContext, ProductDocument } from "@/lib/types";

const evidenceQualityCopy = {
  strong: { label: "Preuve forte", detail: "Identification et informations essentielles clairement présentes." },
  partial: { label: "Preuve partielle", detail: "Document utile, mais certains éléments doivent être complétés." },
  weak: { label: "Preuve faible", detail: "Document insuffisant seul pour démontrer l’exigence." },
};

function formatDate(value?: string | null) {
  if (!value) return "Non trouvée";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function appliedDocument(document: ProductDocument, analysis: DocumentAnalysis): ProductDocument {
  const result = analysis.result;
  if (!result) return document;
  return {
    ...document,
    name: result.suggestedTitle || document.name,
    type: result.documentType,
    expiresAt: result.expiryDate ? formatDate(result.expiryDate) : document.expiresAt,
    analysis: { ...analysis, status: "applied", appliedAt: new Date().toISOString() },
  };
}

export function DocumentAnalysisAction({
  document,
  persistence,
  canAnalyze,
  canApply,
  onUpdated,
}: {
  document: ProductDocument;
  persistence?: PersistenceContext;
  canAnalyze: boolean;
  canApply: boolean;
  onUpdated: (document: ProductDocument) => void;
}) {
  const router = useRouter();
  const supported = isAnalyzableMimeType(document.mimeType);
  const [open, setOpen] = useState(false);
  const [analysis, setAnalysis] = useState(document.analysis);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();

  async function analyze(force = false) {
    setError(undefined);
    setMessage(undefined);

    if (!persistence) {
      const nextAnalysis = demoDocumentAnalysis(document);
      setAnalysis(nextAnalysis);
      onUpdated({ ...document, analysis: nextAnalysis });
      return;
    }

    setLoading(true);
    const response = await fetch(`/api/documents/${document.id}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force }),
    });
    const payload = await response.json().catch(() => ({})) as { analysis?: DocumentAnalysis; error?: string; detail?: string; reused?: boolean };
    if (!response.ok || !payload.analysis) {
      setError(payload.error || "L’analyse n’a pas pu être générée.");
      setLoading(false);
      return;
    }

    setAnalysis(payload.analysis);
    onUpdated({ ...document, analysis: payload.analysis });
    setMessage(payload.reused ? "Résultat existant réutilisé sans nouveau coût." : "Analyse terminée. Vérifiez les propositions avant de les appliquer.");
    setLoading(false);
  }

  async function applyAnalysis() {
    if (!analysis?.result) return;
    setApplying(true);
    setError(undefined);
    setMessage(undefined);

    if (persistence) {
      const { error: applyError } = await createClient().rpc("apply_document_analysis", { p_analysis_id: analysis.id });
      if (applyError) {
        setError(`Les propositions n’ont pas pu être appliquées : ${applyError.message}`);
        setApplying(false);
        return;
      }
    }

    const nextDocument = appliedDocument(document, analysis);
    setAnalysis(nextDocument.analysis);
    onUpdated(nextDocument);
    setMessage("Informations confirmées et enregistrées dans le dossier.");
    setApplying(false);
    router.refresh();
  }

  const triggerLabel = analysis?.status === "applied"
    ? "Analyse appliquée"
    : analysis?.result
      ? "Voir l’analyse IA"
      : "Analyser avec l’IA";

  return (
    <>
      <button
        className={`icon-button analysis-trigger ${analysis?.result ? "analysis-trigger-ready" : ""}`}
        type="button"
        disabled={!supported && !analysis?.result}
        onClick={() => setOpen(true)}
        aria-label={`${triggerLabel} pour ${document.name}`}
        title={supported ? triggerLabel : "Analyse IA disponible pour les PDF et images"}
      >
        {analysis?.status === "applied" ? <CheckCircle2 size={17} /> : <Sparkles size={17} />}
      </button>

      {open ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !loading && !applying) setOpen(false);
        }}>
          <section className="analysis-dialog" role="dialog" aria-modal="true" aria-labelledby="analysis-dialog-title">
            <div className="analysis-dialog-heading">
              <div className="analysis-heading-icon"><BrainCircuit size={22} /></div>
              <div>
                <span className="eyebrow">Lecture assistée</span>
                <h2 id="analysis-dialog-title">Analyse intelligente du document</h2>
                <p>{document.name}</p>
              </div>
              <button className="icon-button" type="button" disabled={loading || applying} onClick={() => setOpen(false)} aria-label="Fermer">
                <X size={19} />
              </button>
            </div>

            {message ? <div className="inline-message analysis-message" aria-live="polite"><CheckCircle2 size={16} />{message}</div> : null}
            {error ? <div className="inline-message inline-message-error analysis-message" role="alert"><AlertCircle size={16} />{error}</div> : null}

            {!analysis?.result ? (
              <div className="analysis-empty">
                <span><FileSearch size={28} /></span>
                <h3>Transformer ce fichier en données exploitables</h3>
                <p>L’IA recherchera le type de preuve, le fabricant, les références, les normes, les dates et les exigences associées.</p>
                <ul>
                  <li><ShieldCheck size={16} />Le fichier reste protégé par les droits de votre organisation.</li>
                  <li><Check size={16} />Aucune information ne sera appliquée sans validation humaine.</li>
                </ul>
                {canAnalyze ? (
                  <button className="button button-primary" type="button" disabled={loading || !supported} onClick={() => void analyze()}>
                    {loading ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}
                    {loading ? "Analyse en cours…" : "Lancer l’analyse"}
                  </button>
                ) : <div className="permission-note"><ShieldCheck size={18} /><p>Votre rôle permet la consultation, mais pas le lancement d’une analyse.</p></div>}
              </div>
            ) : (
              <div className="analysis-content">
                <div className="analysis-score-card">
                  <div className="analysis-confidence" style={{ "--confidence": `${analysis.result.confidence}%` } as CSSProperties}>
                    <strong>{analysis.result.confidence}%</strong><span>confiance</span>
                  </div>
                  <div>
                    <span className={`analysis-quality quality-${analysis.result.evidenceQuality}`}>
                      {evidenceQualityCopy[analysis.result.evidenceQuality].label}
                    </span>
                    <p>{evidenceQualityCopy[analysis.result.evidenceQuality].detail}</p>
                  </div>
                </div>

                <div className="analysis-summary">
                  <strong>Synthèse</strong>
                  <p>{analysis.result.summary}</p>
                </div>

                <dl className="analysis-data-grid">
                  <div><dt>Type proposé</dt><dd>{analysis.result.documentType}</dd></div>
                  <div><dt>Titre détecté</dt><dd>{analysis.result.suggestedTitle || "Non trouvé"}</dd></div>
                  <div><dt>Fabricant</dt><dd>{analysis.result.manufacturerName || "Non trouvé"}</dd></div>
                  <div><dt>Référence produit</dt><dd>{analysis.result.productReference || "Non trouvée"}</dd></div>
                  <div><dt>Émetteur</dt><dd>{analysis.result.issuingBody || "Non trouvé"}</dd></div>
                  <div><dt>Émission / expiration</dt><dd>{formatDate(analysis.result.issueDate)} · {formatDate(analysis.result.expiryDate)}</dd></div>
                </dl>

                <div className="analysis-tag-section">
                  <strong>Normes et références détectées</strong>
                  <div className="analysis-tags">
                    {[...analysis.result.standards, ...analysis.result.regulationReferences].map((value) => <span key={value}>{value}</span>)}
                    {!analysis.result.standards.length && !analysis.result.regulationReferences.length ? <small>Aucune référence clairement détectée.</small> : null}
                  </div>
                </div>

                {analysis.result.requirementMatches.length ? (
                  <div className="analysis-matches">
                    <strong><Link2 size={16} />Exigences proposées</strong>
                    {analysis.result.requirementMatches.map((match) => (
                      <article key={match.productRequirementId}>
                        <span><Check size={14} /></span>
                        <div><strong>{match.title}</strong><p>{match.reason}</p></div>
                        <small>{match.confidence}%</small>
                      </article>
                    ))}
                  </div>
                ) : null}

                {analysis.result.warnings.length ? (
                  <div className="analysis-warnings">
                    <strong><TriangleAlert size={16} />Points à vérifier</strong>
                    <ul>{analysis.result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                  </div>
                ) : null}

                <div className="analysis-disclaimer">
                  <AlertCircle size={16} />
                  <p>Cette lecture assiste la qualification documentaire. Elle ne remplace ni la vérification humaine ni un avis juridique ou une certification.</p>
                </div>

                <div className="analysis-dialog-actions">
                  {canAnalyze ? (
                    <button className="button button-secondary" type="button" disabled={loading || applying} onClick={() => void analyze(true)}>
                      {loading ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}Relancer
                    </button>
                  ) : null}
                  {analysis.status === "applied" ? (
                    <span className="analysis-applied"><CheckCircle2 size={17} />Informations appliquées</span>
                  ) : canApply ? (
                    <button className="button button-primary" type="button" disabled={loading || applying} onClick={() => void applyAnalysis()}>
                      {applying ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}
                      {applying ? "Enregistrement…" : "Valider et appliquer"}
                    </button>
                  ) : <span className="analysis-readonly">Validation réservée aux contributeurs.</span>}
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
