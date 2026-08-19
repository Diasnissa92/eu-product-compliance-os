import type { Product } from "@/lib/types";

const statusLabels: Record<Product["status"], string> = {
  compliant: "Conforme",
  incomplete: "À compléter",
  risk: "À risque",
  blocking: "Bloquant",
};

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function productsToCsv(products: Product[]) {
  const headers = [
    "Produit",
    "Référence / SKU",
    "Catégorie",
    "Fabricant",
    "Pays d’origine",
    "Marchés",
    "Score",
    "Statut",
    "Mise à jour",
  ];
  const rows = products.map((product) => [
    product.name,
    product.sku,
    product.category,
    product.manufacturer,
    product.originCountry,
    product.destinationMarkets.join(", "),
    `${product.score}%`,
    statusLabels[product.status],
    product.updatedAt,
  ]);

  return `sep=;\r\n${[headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
}
