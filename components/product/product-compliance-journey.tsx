import { ArrowRight, CheckCircle2, CircleDashed, Route, ShieldAlert } from "lucide-react";
import Link from "next/link";
import type { ProductJourneyState } from "@/lib/data/regulatory-phase3";

const stateLabel = {
  complete: "Étape couverte",
  current: "À traiter",
  todo: "À venir",
  contextual: "Selon votre modèle",
} as const;

export function ProductComplianceJourney({ journey }: { journey: ProductJourneyState }) {
  const completed = journey.steps.filter((step) => step.state === "complete").length;

  return <section className="panel professional-list-panel">
    <div className="professional-panel-heading compact">
      <span className="feature-icon feature-icon-blue"><Route size={21}/></span>
      <div>
        <span className="eyebrow">Parcours produit · 6 étapes</span>
        <h2>De l’identification à la synthèse traçable</h2>
        <p>{completed}/6 étapes couvertes · {journey.openActions} action{journey.openActions > 1 ? "s" : ""} réglementaire{journey.openActions > 1 ? "s" : ""} ouverte{journey.openActions > 1 ? "s" : ""}</p>
      </div>
      {journey.blockingActions ? <span className="professional-status status-open"><ShieldAlert size={14}/>{journey.blockingActions} blocage{journey.blockingActions > 1 ? "s" : ""}</span> : <span className="professional-status status-closed"><CheckCircle2 size={14}/>Aucun blocage critique</span>}
    </div>

    <div className="incident-list">
      {journey.steps.map((step) => <article className="professional-row" key={step.key}>
        <div>
          <span className={`professional-status status-${step.state === "complete" ? "closed" : step.state === "current" ? "pending" : "draft"}`}>
            {step.state === "complete" ? <CheckCircle2 size={13}/> : <CircleDashed size={13}/>} {step.number} · {stateLabel[step.state]}
          </span>
          <h3>{step.title}</h3>
          <p>{step.detail}</p>
        </div>
        <div className="professional-row-actions"><Link className="button button-secondary" href={step.href}>Ouvrir <ArrowRight size={15}/></Link></div>
      </article>)}
    </div>
    <p className="secure-note">Le parcours mesure la préparation du dossier et les revues effectuées. Il ne transforme jamais un score ou une étape terminée en certification réglementaire.</p>
  </section>;
}
