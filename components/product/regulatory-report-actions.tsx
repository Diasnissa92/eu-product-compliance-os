"use client";

import { Check, Printer, Share2 } from "lucide-react";
import { useState } from "react";

export function RegulatoryReportActions({ productName }: { productName: string }) {
  const [copied, setCopied] = useState(false);

  async function copySecureLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="report-actions">
      <button className="button button-secondary" type="button" onClick={copySecureLink}>
        {copied ? <Check size={17} /> : <Share2 size={17} />}
        {copied ? "Lien copié" : "Copier le lien sécurisé"}
      </button>
      <button className="button button-primary" type="button" onClick={() => window.print()}>
        <Printer size={17} />Imprimer / enregistrer en PDF
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? `Le lien de la fiche ${productName} a été copié.` : ""}
      </span>
    </div>
  );
}
