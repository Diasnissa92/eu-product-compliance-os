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

function parseLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
    } else current += character;
  }
  cells.push(current.trim());
  return cells;
}

export function parseProductCsv(source: string): ProductImportPreview {
  const normalized = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!normalized) return { rows: [], errors: [{ row: 1, message: "Le fichier est vide." }] };
  const lines = normalized.split("\n").filter((line) => line.trim());
  const delimiter = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const rawHeaders = parseLine(lines[0], delimiter);
  const headers = rawHeaders.map((header) => aliases[normalizeHeader(header)]);
  const errors: Array<{ row: number; message: string }> = [];
  if (!headers.includes("name") || !headers.includes("sku")) {
    return { rows: [], errors: [{ row: 1, message: "Les colonnes nom/name et SKU/référence sont obligatoires." }] };
  }

  const rows = lines.slice(1, 101).flatMap((line, index) => {
    const cells = parseLine(line, delimiter);
    const row: ProductImportRow = { name: "", sku: "", category: "", manufacturer: "", originCountry: "", targetMarkets: [] };
    headers.forEach((header, cellIndex) => {
      if (!header) return;
      if (header === "targetMarkets") row.targetMarkets = (cells[cellIndex] || "").split(/[|,/]/).map((value) => value.trim()).filter(Boolean);
      else row[header] = cells[cellIndex]?.trim() || "";
    });
    if (!row.name || !row.sku) {
      errors.push({ row: index + 2, message: "Nom et SKU sont obligatoires." });
      return [];
    }
    return [row];
  });

  if (lines.length > 101) errors.push({ row: 102, message: "Seules les 100 premières lignes ont été préparées." });
  return { rows, errors };
}

export const productImportTemplate = "nom;sku;catégorie;fabricant;pays_origine;marchés\nLampe Luma Mini;LUM-204-FR;Équipement électrique;Nordhavn Design ApS;Danemark;France|Belgique";

