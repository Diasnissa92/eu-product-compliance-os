export type EcommerceListingInput = {
  title: string;
  productIdentifier: string;
  manufacturerName: string;
  manufacturerPostalAddress: string;
  manufacturerElectronicAddress: string;
  responsiblePersonName: string;
  responsiblePersonPostalAddress: string;
  responsiblePersonElectronicAddress: string;
  warnings: string;
  language: string;
  traceabilityImage: boolean;
};

export type EcommerceFinding = {
  id: keyof EcommerceListingInput;
  label: string;
  status: "pass" | "warning" | "fail";
  detail: string;
  weight: number;
};

export type EcommerceAuditResult = {
  score: number;
  status: "compliant" | "review" | "blocking";
  findings: EcommerceFinding[];
  summary: string;
};

const checks: Array<{
  id: keyof EcommerceListingInput;
  label: string;
  detail: string;
  weight: number;
  optional?: boolean;
}> = [
  { id: "title", label: "Identification claire du produit", detail: "Le titre doit permettre d’identifier le produit vendu.", weight: 8 },
  { id: "productIdentifier", label: "Référence, type ou lot", detail: "Une référence traçable doit être visible dans l’offre.", weight: 14 },
  { id: "manufacturerName", label: "Nom du fabricant", detail: "Le nom ou la marque du fabricant doit apparaître.", weight: 10 },
  { id: "manufacturerPostalAddress", label: "Adresse postale du fabricant", detail: "L’adresse postale du fabricant doit être accessible avant l’achat.", weight: 12 },
  { id: "manufacturerElectronicAddress", label: "Adresse électronique du fabricant", detail: "Une adresse électronique de contact doit être indiquée.", weight: 10 },
  { id: "responsiblePersonName", label: "Responsable dans l’Union européenne", detail: "À compléter lorsque le fabricant n’est pas établi dans l’Union.", weight: 8, optional: true },
  { id: "responsiblePersonPostalAddress", label: "Adresse postale du responsable UE", detail: "Requise lorsqu’un responsable UE doit être désigné.", weight: 8, optional: true },
  { id: "responsiblePersonElectronicAddress", label: "Adresse électronique du responsable UE", detail: "Requise lorsqu’un responsable UE doit être désigné.", weight: 8, optional: true },
  { id: "warnings", label: "Avertissements et informations de sécurité", detail: "Les avertissements applicables doivent être visibles et compréhensibles.", weight: 12 },
  { id: "language", label: "Langue du marché ciblé", detail: "Les informations de sécurité doivent être fournies dans une langue comprise sur le marché.", weight: 6 },
  { id: "traceabilityImage", label: "Image de traçabilité", detail: "Une image du produit et de son identification réduit les ambiguïtés.", weight: 4 },
];

function hasValue(input: EcommerceListingInput, id: keyof EcommerceListingInput) {
  const value = input[id];
  return typeof value === "boolean" ? value : value.trim().length > 1;
}

export function auditEcommerceListing(input: EcommerceListingInput, manufacturerInEu: boolean): EcommerceAuditResult {
  const findings = checks.map((check): EcommerceFinding => {
    const required = !check.optional || !manufacturerInEu;
    const present = hasValue(input, check.id);
    if (present) return { ...check, status: "pass" };
    if (!required) return { ...check, status: "warning", detail: `${check.detail} Non exigé d’après la localisation déclarée, à confirmer.` };
    return { ...check, status: "fail" };
  });

  const requiredWeight = findings.reduce((sum, item) => sum + (item.status === "warning" ? 0 : item.weight), 0);
  const passedWeight = findings.reduce((sum, item) => sum + (item.status === "pass" ? item.weight : 0), 0);
  const score = Math.max(0, Math.min(100, Math.round((passedWeight / Math.max(requiredWeight, 1)) * 100)));
  const blocking = findings.some((item) => item.status === "fail" && item.weight >= 12);
  const status = blocking ? "blocking" : score >= 90 ? "compliant" : "review";
  const failures = findings.filter((item) => item.status === "fail").length;

  return {
    score,
    status,
    findings,
    summary: failures === 0 ? "Les mentions essentielles sont présentes. Une validation humaine reste nécessaire." : `${failures} mention${failures > 1 ? "s" : ""} obligatoire${failures > 1 ? "s" : ""} à compléter avant publication.`,
  };
}

