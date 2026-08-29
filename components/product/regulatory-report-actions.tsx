"use client";

import { Check, Download, Printer, Share2 } from "lucide-react";
import { useState } from "react";
import { copyText, downloadBlob } from "@/lib/client-actions";
import {
  createRegulatoryReportPdf,
  regulatoryReportPdfFilename,
  type RegulatoryReportPdfData,
} from "@/lib/report-pdf";

export function RegulatoryReportActions({ report }: { report: RegulatoryReportPdfData }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string>();

  async function copySecureLink() {
    setFeedback(undefined);
    try {
      await copyText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setFeedback("Le lien n’a pas pu être copié. Copiez l’adresse affichée par votre navigateur.");
    }
  }

  function downloadPdf() {
    setFeedback(undefined);
    try {
      downloadBlob(createRegulatoryReportPdf(report), regulatoryReportPdfFilename(report.productName));
    } catch {
      setFeedback("Le PDF n’a pas pu être généré. Réessayez ou utilisez le bouton Imprimer.");
    }
  }

  return (
    <div className="report-actions">
      <button className="button button-secondary" type="button" onClick={() => void copySecureLink()}>
        {copied ? <Check size={17} /> : <Share2 size={17} />}
        {copied ? "Lien copié" : "Copier le lien sécurisé"}
      </button>
      <button className="button button-secondary" type="button" onClick={() => window.print()}>
        <Printer size={17} />Imprimer
      </button>
      <button className="button button-primary" type="button" onClick={downloadPdf}>
        <Download size={17} />Télécharger le PDF
      </button>
      <span className="sr-only" aria-live="polite">
        {feedback || (copied ? `Le lien de la fiche ${report.productName} a été copié.` : "")}
      </span>
    </div>
  );
}
