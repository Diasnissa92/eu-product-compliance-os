"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

export function ProductActions({ productId }: { productId: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const reportUrl = new URL(`/products/${productId}/report`, window.location.origin).toString();
    await navigator.clipboard.writeText(reportUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="heading-actions">
      <button className="button button-secondary" type="button" onClick={copyLink}>
        {copied ? <Check size={17} /> : <Share2 size={17} />}
        {copied ? "Lien sécurisé copié" : "Partager la fiche"}
      </button>
    </div>
  );
}
