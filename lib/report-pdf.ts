export type RegulatoryReportPdfData = {
  productName: string;
  sku: string;
  category: string;
  manufacturer: string;
  originCountry: string;
  destinationMarkets: string[];
  frameworks: string[];
  organizationName: string;
  generatedAt: string;
  generatedBy: string;
  updatedAt: string;
  score: number;
  status: string;
  closedRequirements: number;
  totalRequirements: number;
  verifiedDocuments: number;
  totalDocuments: number;
  nextDeadline: string;
  engineVersion: string;
  regulatoryAssessments: Array<{
    regulation: string;
    outcome: string;
    rationale: string;
    sourceReference: string;
  }>;
  regulatoryActions: Array<{
    title: string;
    regulation: string;
    severity: string;
    status: string;
    owner: string;
    dueDate: string;
  }>;
  requirements: Array<{
    title: string;
    regulation: string;
    severity: string;
    status: string;
    evidence: string;
  }>;
  documents: Array<{
    name: string;
    type: string;
    status: string;
    uploadedAt: string;
    expiresAt: string;
  }>;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 44;
const NAVY = "#062f3a";
const GREEN = "#15966f";
const INK = "#082f40";
const MUTED = "#607882";
const LINE = "#dce8e5";
const SOFT = "#f3f8f6";

const winAnsiExtra: Record<string, number> = {
  "€": 0x80,
  "‚": 0x82,
  "ƒ": 0x83,
  "„": 0x84,
  "…": 0x85,
  "†": 0x86,
  "‡": 0x87,
  "ˆ": 0x88,
  "‰": 0x89,
  "Š": 0x8a,
  "‹": 0x8b,
  "Œ": 0x8c,
  "Ž": 0x8e,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "•": 0x95,
  "–": 0x96,
  "—": 0x97,
  "˜": 0x98,
  "™": 0x99,
  "š": 0x9a,
  "›": 0x9b,
  "œ": 0x9c,
  "ž": 0x9e,
  "Ÿ": 0x9f,
};

function toWinAnsi(value: string) {
  let encoded = "";

  for (const character of value.normalize("NFC")) {
    const codePoint = character.codePointAt(0) ?? 0x3f;
    let byte = winAnsiExtra[character];

    if (byte === undefined) {
      byte = codePoint <= 0xff ? codePoint : 0x3f;
    }

    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) {
      encoded += `\\${String.fromCharCode(byte)}`;
    } else if (byte < 0x20) {
      encoded += " ";
    } else {
      encoded += String.fromCharCode(byte);
    }
  }

  return encoded;
}

function pdfString(value: string) {
  return `(${toWinAnsi(value)})`;
}

function number(value: number) {
  return Number(value.toFixed(2)).toString();
}

function rgb(hex: string) {
  const normalized = hex.replace("#", "");
  return [0, 2, 4]
    .map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255)
    .map(number)
    .join(" ");
}

function fillRect(x: number, y: number, width: number, height: number, color: string) {
  return `q ${rgb(color)} rg ${number(x)} ${number(y)} ${number(width)} ${number(height)} re f Q`;
}

function strokeLine(x1: number, y1: number, x2: number, y2: number, color = LINE, width = 1) {
  return `q ${rgb(color)} RG ${number(width)} w ${number(x1)} ${number(y1)} m ${number(x2)} ${number(y2)} l S Q`;
}

function drawText(value: string, x: number, y: number, size = 10, bold = false, color = INK) {
  return `BT /${bold ? "F2" : "F1"} ${number(size)} Tf ${rgb(color)} rg 1 0 0 1 ${number(x)} ${number(y)} Tm ${pdfString(value)} Tj ET`;
}

function estimateTextWidth(value: string, size: number, bold = false) {
  return value.length * size * (bold ? 0.55 : 0.5);
}

function wrapText(value: string, maxWidth: number, size: number, bold = false) {
  const lines: string[] = [];

  for (const paragraph of value.split(/\r?\n/)) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    let line = "";

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && estimateTextWidth(candidate, size, bold) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }

    if (line) lines.push(line);
  }

  return lines.length ? lines : [""];
}

function binaryBytes(value: string) {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function assemblePdf(pageStreams: string[]) {
  const objects: string[] = [];
  const pageReferences: string[] = [];

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  pageStreams.forEach((stream, index) => {
    const pageObject = 5 + index * 2;
    const contentObject = pageObject + 1;
    pageReferences.push(`${pageObject} 0 R`);
    objects[pageObject] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${number(PAGE_WIDTH)} ${number(PAGE_HEIGHT)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObject} 0 R >>`;
    objects[contentObject] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  objects[2] = `<< /Type /Pages /Kids [${pageReferences.join(" ")}] /Count ${pageReferences.length} >>`;

  let output = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [0];

  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = output.length;
    output += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = output.length;
  output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    output += `${offsets[index].toString().padStart(10, "0")} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return binaryBytes(output);
}

export function createRegulatoryReportPdf(data: RegulatoryReportPdfData) {
  const pages: string[][] = [];
  let operations: string[] = [];
  let y = 0;

  function startPage(continuation = false) {
    operations = [];
    pages.push(operations);
    operations.push(fillRect(0, PAGE_HEIGHT - 68, PAGE_WIDTH, 68, NAVY));
    operations.push(drawText("EU Compliance", MARGIN, PAGE_HEIGHT - 39, 15, true, "#ffffff"));
    operations.push(drawText("PRODUCT OS", MARGIN, PAGE_HEIGHT - 53, 7, false, "#8fcabd"));
    if (continuation) {
      const titleWidth = estimateTextWidth(data.productName, 9, true);
      const titleX = Math.max(MARGIN + 150, PAGE_WIDTH - MARGIN - titleWidth);
      operations.push(drawText(data.productName, titleX, PAGE_HEIGHT - 43, 9, true, "#ffffff"));
    }
    y = PAGE_HEIGHT - 98;
  }

  function ensureSpace(height: number) {
    if (y - height < 48) startPage(true);
  }

  function addWrappedText(value: string, x: number, maxWidth: number, size = 10, bold = false, color = INK, lineHeight = size * 1.35) {
    const lines = wrapText(value, maxWidth, size, bold);
    for (const line of lines) {
      operations.push(drawText(line, x, y, size, bold, color));
      y -= lineHeight;
    }
  }

  function addSection(numberLabel: string, eyebrow: string, title: string) {
    ensureSpace(52);
    operations.push(strokeLine(MARGIN, y, PAGE_WIDTH - MARGIN, y));
    y -= 25;
    operations.push(fillRect(MARGIN, y - 8, 28, 28, "#e2f6ef"));
    operations.push(drawText(numberLabel, MARGIN + 8, y + 2, 8, true, GREEN));
    operations.push(drawText(eyebrow.toUpperCase(), MARGIN + 40, y + 11, 7, true, MUTED));
    operations.push(drawText(title, MARGIN + 40, y - 5, 15, true));
    y -= 36;
  }

  function addDetail(label: string, value: string) {
    ensureSpace(34);
    operations.push(drawText(label, MARGIN, y, 7, true, MUTED));
    y -= 14;
    addWrappedText(value, MARGIN, PAGE_WIDTH - MARGIN * 2, 10, true, INK, 13);
    y -= 9;
  }

  startPage();
  operations.push(drawText("FICHE RÉGLEMENTAIRE PRODUIT", MARGIN, y, 8, true, MUTED));
  y -= 30;
  addWrappedText(data.productName, MARGIN, 390, 24, true, INK, 27);
  operations.push(drawText(`${data.score}%`, PAGE_WIDTH - MARGIN - 62, PAGE_HEIGHT - 135, 27, true));
  operations.push(drawText(data.status, PAGE_WIDTH - MARGIN - 70, PAGE_HEIGHT - 153, 8, true, GREEN));
  operations.push(drawText(`${data.sku} · ${data.category}`, MARGIN, y, 10, false, MUTED));
  y -= 31;

  operations.push(fillRect(MARGIN, y - 62, PAGE_WIDTH - MARGIN * 2, 72, SOFT));
  const metadata = [
    ["Organisation", data.organizationName],
    ["Édité le", data.generatedAt],
    ["Édité par", data.generatedBy],
    ["Moteur", data.engineVersion],
  ];
  metadata.forEach(([label, value], index) => {
    const x = MARGIN + index * ((PAGE_WIDTH - MARGIN * 2) / 4) + 12;
    operations.push(drawText(label, x, y - 14, 7, false, MUTED));
    operations.push(drawText(value, x, y - 31, 8, true));
  });
  y -= 92;

  const summaries = [
    [`${data.regulatoryAssessments.length}`, "Cadres évalués"],
    [`${data.regulatoryActions.filter((action) => !["Terminée", "Écartée"].includes(action.status)).length}`, "Actions de qualification"],
    [`${data.verifiedDocuments}/${data.totalDocuments}`, "Documents vérifiés"],
  ];
  const cardWidth = (PAGE_WIDTH - MARGIN * 2 - 20) / 3;
  summaries.forEach(([value, label], index) => {
    const x = MARGIN + index * (cardWidth + 10);
    operations.push(fillRect(x, y - 50, cardWidth, 58, "#ffffff"));
    operations.push(strokeLine(x, y + 8, x + cardWidth, y + 8));
    operations.push(drawText(value, x + 12, y - 15, 14, true));
    operations.push(drawText(label, x + 12, y - 32, 7, false, MUTED));
  });
  y -= 76;

  addSection("01", "Identification", "Informations produit");
  addDetail("FABRICANT", data.manufacturer);
  addDetail("PAYS D’ORIGINE", data.originCountry);
  addDetail("MARCHÉS DE DESTINATION", data.destinationMarkets.join(", ") || "À préciser");
  addDetail("RÉFÉRENTIELS MATÉRIALISÉS", data.frameworks.join(" · ") || "Aucun référentiel matérialisé");

  addSection("02", "Qualification", "Évaluation réglementaire versionnée");
  operations.push(drawText(`Version du moteur : ${data.engineVersion}`, MARGIN, y, 8, true, GREEN));
  y -= 20;
  if (data.regulatoryAssessments.length === 0) {
    addWrappedText("Aucune évaluation réglementaire n’est enregistrée pour cette version du moteur.", MARGIN, PAGE_WIDTH - MARGIN * 2, 10, false, MUTED);
    y -= 12;
  }
  data.regulatoryAssessments.forEach((item, index) => {
    ensureSpace(78);
    operations.push(drawText(`${index + 1}. ${item.regulation} · ${item.outcome}`, MARGIN, y, 10, true));
    y -= 15;
    addWrappedText(item.rationale, MARGIN + 12, PAGE_WIDTH - MARGIN * 2 - 12, 8, false, MUTED, 11);
    operations.push(drawText(`Source : ${item.sourceReference}`, MARGIN + 12, y, 8, false, GREEN));
    y -= 18;
    operations.push(strokeLine(MARGIN, y, PAGE_WIDTH - MARGIN, y));
    y -= 12;
  });

  addSection("03", "Plan d’actions", "Revues et informations à traiter");
  if (data.regulatoryActions.length === 0) {
    addWrappedText("Aucune action réglementaire n’est enregistrée pour cette version du moteur.", MARGIN, PAGE_WIDTH - MARGIN * 2, 10, false, MUTED);
    y -= 12;
  }
  data.regulatoryActions.forEach((action, index) => {
    ensureSpace(64);
    operations.push(drawText(`${index + 1}. ${action.title}`, MARGIN, y, 10, true));
    y -= 15;
    addWrappedText(`${action.regulation} · ${action.severity} · ${action.status}`, MARGIN + 12, PAGE_WIDTH - MARGIN * 2 - 12, 8, false, MUTED, 11);
    operations.push(drawText(`Responsable : ${action.owner} · Échéance : ${action.dueDate}`, MARGIN + 12, y, 8, false, GREEN));
    y -= 18;
    operations.push(strokeLine(MARGIN, y, PAGE_WIDTH - MARGIN, y));
    y -= 12;
  });

  addSection("04", "Exigences matérialisées", "Checklist de conformité");
  if (data.requirements.length === 0) {
    addWrappedText("Aucune exigence active n’est matérialisée dans la checklist. Cela ne signifie pas qu’aucun texte ne s’applique : voir la qualification ci-dessus.", MARGIN, PAGE_WIDTH - MARGIN * 2, 10, false, MUTED);
    y -= 12;
  }
  data.requirements.forEach((requirement, index) => {
    ensureSpace(57);
    operations.push(drawText(`${index + 1}. ${requirement.title}`, MARGIN, y, 10, true));
    y -= 15;
    addWrappedText(`${requirement.regulation} · ${requirement.severity} · ${requirement.status}`, MARGIN + 12, PAGE_WIDTH - MARGIN * 2 - 12, 8, false, MUTED, 11);
    operations.push(drawText(`Preuve liée : ${requirement.evidence}`, MARGIN + 12, y, 8, false, GREEN));
    y -= 18;
    operations.push(strokeLine(MARGIN, y, PAGE_WIDTH - MARGIN, y));
    y -= 12;
  });

  addSection("05", "Coffre de preuves", "Documents réglementaires");
  if (data.documents.length === 0) {
    addWrappedText("Aucun document n’est encore enregistré.", MARGIN, PAGE_WIDTH - MARGIN * 2, 10, false, MUTED);
    y -= 12;
  }
  data.documents.forEach((document, index) => {
    ensureSpace(57);
    operations.push(drawText(`${index + 1}. ${document.name}`, MARGIN, y, 10, true));
    y -= 15;
    addWrappedText(`${document.type} · ${document.status}`, MARGIN + 12, PAGE_WIDTH - MARGIN * 2 - 12, 8, false, MUTED, 11);
    operations.push(drawText(`Ajout : ${document.uploadedAt} · Expiration : ${document.expiresAt}`, MARGIN + 12, y, 8, false, GREEN));
    y -= 18;
    operations.push(strokeLine(MARGIN, y, PAGE_WIDTH - MARGIN, y));
    y -= 12;
  });

  ensureSpace(82);
  operations.push(fillRect(MARGIN, y - 56, PAGE_WIDTH - MARGIN * 2, 66, SOFT));
  operations.push(drawText("Traçabilité protégée", MARGIN + 12, y - 10, 9, true));
  y -= 25;
  addWrappedText(
    `Cette fiche est générée à partir des données accessibles à l’organisation ${data.organizationName}. Les résultats de qualification décrivent une revue versionnée du dossier. Ils ne constituent ni une certification, ni un avis juridique, ni la décision d’un organisme notifié.`,
    MARGIN + 12,
    PAGE_WIDTH - MARGIN * 2 - 24,
    7,
    false,
    MUTED,
    9,
  );

  const streams = pages.map((page) => page.join("\n"));
  return new Blob([assemblePdf(streams)], { type: "application/pdf" });
}

export function regulatoryReportPdfFilename(productName: string) {
  const slug = productName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `fiche-reglementaire-${slug || "produit"}.pdf`;
}
