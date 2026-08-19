"use client";

import { Check, Download, Printer, Share2 } from "lucide-react";
import { useState } from "react";
import {
  createRegulatoryReportPdf,
  regulatoryReportPdfFilename,
  type RegulatoryReportPdfData,
} from "@/lib/report-pdf";

export function RegulatoryReportActions({ report }: { report: RegulatoryReportPdfData }) {
  const [copied, setCopied] = useState(false);

  async function copySecureLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadPdf() {
    const file = createRegulatoryReportPdf(report);
    const fileUrl = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = regulatoryReportPdfFilename(report.productName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
  }

  return (
    <div className="report-actions">
      <button className="button button-secondary" type="button" onClick={copySecureLink}>
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
        {copied ? `Le lien de la fiche ${report.productName} a été copié.` : ""}
      </span>
    </div>
  );
}
