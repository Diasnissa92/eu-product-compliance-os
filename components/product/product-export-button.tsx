"use client";

import { Check, Download } from "lucide-react";
import { useState } from "react";
import { productsToCsv } from "@/lib/product-export";
import type { Product } from "@/lib/types";

export function ProductExportButton({ products }: { products: Product[] }) {
  const [exported, setExported] = useState(false);

  function exportProducts() {
    const blob = new Blob([`\uFEFF${productsToCsv(products)}`], { type: "text/csv;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `registre-produits-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    setExported(true);
    window.setTimeout(() => setExported(false), 1800);
  }

  return (
    <button className="button button-secondary" type="button" onClick={exportProducts} disabled={!products.length}>
      {exported ? <Check size={17} /> : <Download size={17} />}
      {exported ? "Export téléchargé" : "Exporter en CSV"}
    </button>
  );
}
