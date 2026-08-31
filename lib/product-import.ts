import Papa from "papaparse";

export type ProductImportRow = {
  name: string;
  sku: string;
  category: string;
  manufacturer: string;
  originCountry: string;
  targetMarkets: string[];
};

export type ProductImportPreview = {
  rows: ProductImportRow[];
  errors: Array<{ row: number; message: string }>;
};

const aliases: Record<string, keyof ProductImportRow> = {
  name: "name",
  nom: "name",
  produit: "name",
  sku: "sku",
  reference: "sku",
  référence: "sku",
  category: "category",
  categorie: "category",
  catégorie: "category",
  manufacturer: "manufacturer",
  fabricant: "manufacturer",
  origincountry: "originCountry",
  paysorigine: "originCountry",
  paysdorigine: "originCountry",
  targetmarkets: "targetMarkets",
  marches: "targetMarkets",
  marchés: "targetMarkets",
};

function normalizeHeader(value: string) {
  return value.trim().toLocaleLowerCase("fr").replace(/[\s_'’-]/g, "");
}

export function parseProductCsv(source: string): ProductImportPreview {
  const normalized = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!normalized) return { rows: [], errors: [{ row: 1, message: "Le fichier est vide." }] };
  const parsed = Papa.parse<string[]>(normalized, { skipEmptyLines: "greedy" });
  const rawRows = parsed.data;
  const errors: Array<{ row: number; message: string }> = parsed.errors.map((error) => ({ row: (error.row ?? 0) + 1, message: `CSV invalide : ${error.message}` }));
  if (!rawRows.length) return { rows: [], errors: [{ row: 1, message: "Le fichier est vide." }] };
  const rawHeaders = rawRows[0].map((header) => String(header || ""));
  const headers = rawHeaders.map((header) => aliases[normalizeHeader(header)]);
  if (!headers.includes("name") || !headers.includes("sku")) {
    return { rows: [], errors: [{ row: 1, message: "Les colonnes nom/name et SKU/référence sont obligatoires." }] };
  }

  const seenSkus = new Set<string>();
  const rows = rawRows.slice(1, 101).flatMap((cells, index) => {
    const row: ProductImportRow = { name: "", sku: "", category: "", manufacturer: "", originCountry: "", targetMarkets: [] };
    headers.forEach((header, cellIndex) => {
      if (!header) return;
      const cell = String(cells[cellIndex] || "").trim();
      if (header === "targetMarkets") row.targetMarkets = cell.split(/[|,/]/).map((value) => value.trim()).filter(Boolean).slice(0, 30);
      else row[header] = cell;
    });
    if (!row.name || !row.sku) {
      errors.push({ row: index + 2, message: "Nom et SKU sont obligatoires." });
      return [];
    }
    if ([row.name, row.sku, row.category, row.manufacturer, row.originCountry].some((value) => value.length > 240)) {
      errors.push({ row: index + 2, message: "Une valeur dépasse la limite de 240 caractères." });
      return [];
    }
    const normalizedSku = row.sku.toLocaleLowerCase("fr");
    if (seenSkus.has(normalizedSku)) {
      errors.push({ row: index + 2, message: `SKU dupliqué dans le fichier : ${row.sku}` });
      return [];
    }
    seenSkus.add(normalizedSku);
    return [row];
  });

  if (rawRows.length > 101) errors.push({ row: 102, message: "Seules les 100 premières lignes ont été préparées." });
  return { rows, errors };
}

export const productImportTemplate = "nom;sku;catégorie;fabricant;pays_origine;marchés\nLampe Luma Mini;LUM-204-FR;Équipement électrique;Nordhavn Design ApS;Danemark;France|Belgique";
