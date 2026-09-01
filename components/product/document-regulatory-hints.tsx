import { FileSearch2, ShieldAlert } from "lucide-react";

export type DocumentRegulatoryHint = {
  documentName: string;
  confidence: number;
  manufacturerName?: string;
  productReference?: string;
  regulationReferences: string[];
  standards: string[];
  warnings: string[];
};

export function DocumentRegulatoryHints({ hints }: { hints: DocumentRegulatoryHint[] }) {
  if (!hints.length) return null;

  return <section className="panel professional-list-panel">
    <div className="professional-panel-heading compact">
      <span className="feature-icon feature-icon-rose"><FileSearch2 size={20}/></span>
      <div>
        <span className="eyebrow">Assistant documentaire</span>
        <h2>Indices extraits des documents déjà analysés</h2>
        <p>Ces éléments servent à préparer vos réponses. Ils ne modifient jamais automatiquement la qualification réglementaire.</p>
      </div>
      <span className="professional-count">{hints.length}</span>
    </div>
    <div className="incident-list">
      {hints.map((hint) => <article className="professional-row" key={hint.documentName}>
        <div>
          <span className={`professional-status status-${hint.confidence >= 85 ? "closed" : hint.confidence >= 60 ? "pending" : "draft"}`}>Confiance documentaire {hint.confidence}%</span>
          <h3>{hint.documentName}</h3>
          {hint.manufacturerName || hint.productReference ? <p>{hint.manufacturerName ? `Fabricant détecté : ${hint.manufacturerName}. ` : ""}{hint.productReference ? `Référence détectée : ${hint.productReference}.` : ""}</p> : null}
          {hint.regulationReferences.length ? <p><strong>Références détectées :</strong> {hint.regulationReferences.join(" · ")}</p> : null}
          {hint.standards.length ? <p><strong>Normes citées :</strong> {hint.standards.join(" · ")}</p> : null}
          {hint.warnings.map((warning) => <p key={warning} className="secure-note"><ShieldAlert size={14}/>{warning}</p>)}
        </div>
      </article>)}
    </div>
    <p className="secure-note"><ShieldAlert size={14}/>Une référence trouvée dans un document prouve seulement que le document la cite. Elle ne prouve ni l’applicabilité du texte au produit, ni la conformité du produit.</p>
  </section>;
}
