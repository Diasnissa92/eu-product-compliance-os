"use client";

import { Check, ScanSearch, Share2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { copyText } from "@/lib/client-actions";

export function ProductActions({ productId }: { productId: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  async function copyLink() {
    const reportUrl = new URL(`/products/${productId}/report`, window.location.origin).toString();
    setError(false);
    try {
      await copyText(reportUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(true);
    }
  }

  return (
    <div className="heading-actions">
      <Link className="button button-primary" href={`/products/${productId}/regulatory`}><ScanSearch size={17}/>Évaluation réglementaire</Link>
      <button className="button button-secondary" type="button" onClick={() => void copyLink()}>
        {copied ? <Check size={17} /> : <Share2 size={17} />}
        {copied ? "Lien sécurisé copié" : "Partager la fiche"}
      </button>
      <span className="sr-only" role={error ? "alert" : undefined} aria-live="polite">{error ? "Le lien n’a pas pu être copié. Ouvrez la fiche puis copiez son adresse." : copied ? "Le lien sécurisé a été copié." : ""}</span>
    </div>
  );
}
