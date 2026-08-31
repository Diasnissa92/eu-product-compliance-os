import { XMLParser } from "fast-xml-parser";

export const safetyGateReportListUrl = "https://ec.europa.eu/safety-gate-alerts/api/download/weeklyReport/list/xml/en";
const reportDetailPrefix = "https://ec.europa.eu/safety-gate-alerts/api/download/weeklyReport/detail/xml/";
const alertDetailPrefix = "https://ec.europa.eu/safety-gate-alerts/screen/webReport/alertDetail/";

export type SafetyGateReport = {
  reference: string;
  publicationDate: string;
  reportId: string;
  url: string;
};

export type SafetyGateAlert = {
  reference: string;
  url: string;
  category: string;
  product: string;
  brand: string;
  model: string;
  batch: string;
  barcode: string;
  riskType: string;
  riskLevel: string;
  notifyingCountry: string;
  countryOfOrigin: string;
  description: string;
  danger: string;
};

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
  processEntities: true,
});

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
}

function text(value: unknown, limit = 6000): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim().slice(0, limit);
  return "";
}

function reportIdFromUrl(value: string) {
  const match = value.match(/^https:\/\/ec\.europa\.eu\/safety-gate-alerts\/api\/download\/weeklyReport\/detail\/xml\/(\d+)(?:\?|$)/);
  return match?.[1];
}

function alertUrl(value: string) {
  return value.startsWith(alertDetailPrefix) && /^\d+$/.test(value.slice(alertDetailPrefix.length)) ? value : "";
}

export function buildSafetyGateReportUrl(reportId: string) {
  if (!/^\d+$/.test(reportId)) throw new Error("Identifiant de rapport Safety Gate invalide.");
  return `${reportDetailPrefix}${reportId}?language=en&search=WEB_REPORT%7C:%7C${reportId}`;
}

export function parseSafetyGateReportList(xml: string, limit = 2): SafetyGateReport[] {
  const root = record(record(parser.parse(xml))["Safety-Gate"]);
  return list(root.weeklyReport).flatMap((entry) => {
    const item = record(entry);
    const reference = text(item.reference, 80);
    const publicationDate = text(item.publicationDate, 20);
    const sourceUrl = text(item.URL, 500);
    const reportId = reportIdFromUrl(sourceUrl);
    if (!reference || !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(publicationDate) || !reportId) return [];
    return [{ reference, publicationDate, reportId, url: buildSafetyGateReportUrl(reportId) }];
  }).slice(0, Math.max(1, Math.min(limit, 4)));
}

export function parseSafetyGateAlerts(xml: string): SafetyGateAlert[] {
  const root = record(record(parser.parse(xml))["Safety-Gate"]);
  const seen = new Set<string>();
  return list(root.notifications).flatMap((entry) => {
    const item = record(entry);
    const reference = text(item.caseNumber, 80);
    const url = alertUrl(text(item.reference, 500));
    if (!reference || !url || seen.has(reference)) return [];
    seen.add(reference);
    return [{
      reference,
      url,
      category: text(item.category, 240),
      product: text(item.product, 300),
      brand: text(item.brand, 240),
      model: text(item.type_numberOfModel, 1000),
      batch: text(item.batchNumber, 1000),
      barcode: text(item.barcode, 1000),
      riskType: text(item.riskType, 240),
      riskLevel: text(item.level, 120),
      notifyingCountry: text(item.notifyingCountry, 160),
      countryOfOrigin: text(item.countryOfOrigin, 160),
      description: text(item.description),
      danger: text(item.danger),
    }];
  }).slice(0, 1000);
}

export function isoDateFromEuropean(value: string) {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) throw new Error("Date de publication Safety Gate invalide.");
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
