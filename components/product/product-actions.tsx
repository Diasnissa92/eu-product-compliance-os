"use client";

import { Check, MoreHorizontal, Share2 } from "lucide-react";
import { useState } from "react";

export function ProductActions() {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="heading-actions">
      <button className="button button-secondary" type="button" onClick={copyLink}>
        {copied ? <Check size={17} /> : <Share2 size={17} />}
        {copied ? "Lien copié" : "Partager la fiche"}
      </button>
      <button className="icon-button bordered-icon" type="button" aria-label="Plus d’actions"><MoreHorizontal size={19} /></button>
    </div>
  );
}
