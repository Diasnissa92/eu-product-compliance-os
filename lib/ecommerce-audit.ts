export type EcommerceListingInput = {
  title: string;
  productIdentifier: string;
  manufacturerName: string;
  manufacturerPostalAddress: string;
  manufacturerElectronicAddress: string;
  responsiblePersonName: string;
  responsiblePersonPostalAddress: string;
  responsiblePersonElectronicAddress: string;
  warningsApplicable: boolean;
  warnings: string;
  warningsNotApplicableReason: string;
  language: string;
  traceabilityImage: boolean;
};

export type EcommerceFinding = {
  id: keyof EcommerceListingInput;
  label: string;
  status: "pass" | "warning" | "fail";
  detail: string;
  legalReference: string;
  weight: number;
};

export type EcommerceAuditResult = {
  score: number;
  status: "compliant" | "review" | "blocking";
  findings: EcommerceFinding[];
  summary: string;
};

type ConditionalCheck = {
  id: keyof EcommerceListingInput;
  label: string;
  detail: string;
  legalReference: string;
  weight: number;
  requiredWhen?: "manufacturerOutsideEu" | "warningsApplicable" | "warningsNotApplicable";
};

const article19 = "Règlement (UE) 2023/988, article 19";
const checks: ConditionalCheck[] = [
  { id: "title", label: "Identification claire du produit", detail: "Le titre doit permettre d’identifier le produit vendu.", legalReference: article19, weight: 6 },
  { id: "productIdentifier", label: "Type, lot ou autre identifiant", detail: "Un identifiant traçable doit être visible dans l’offre.", legalReference: article19, weight: 12 },
  { id: "manufacturerName", label: "Nom du fabricant", detail: "Le nom, la raison sociale ou la marque du fabricant doit apparaître.", legalReference: article19, weight: 9 },
  { id: "manufacturerPostalAddress", label: "Adresse postale du fabricant", detail: "L’adresse postale du fabricant doit être visible avant l’achat.", legalReference: article19, weight: 10 },
  { id: "manufacturerElectronicAddress", label: "Adresse électronique du fabricant", detail: "Une adresse électronique permettant de contacter le fabricant doit être indiquée.", legalReference: article19, weight: 9 },
  { id: "responsiblePersonName", label: "Responsable dans l’Union européenne", detail: "Requis lorsque le fabricant n’est pas établi dans l’Union.", legalReference: article19, weight: 8, requiredWhen: "manufacturerOutsideEu" },
  { id: "responsiblePersonPostalAddress", label: "Adresse postale du responsable UE", detail: "Requise lorsque le fabricant n’est pas établi dans l’Union.", legalReference: article19, weight: 8, requiredWhen: "manufacturerOutsideEu" },
  { id: "responsiblePersonElectronicAddress", label: "Adresse électronique du responsable UE", detail: "Requise lorsque le fabricant n’est pas établi dans l’Union.", legalReference: article19, weight: 8, requiredWhen: "manufacturerOutsideEu" },
  { id: "warnings", label: "Avertissements et informations de sécurité", detail: "Toute information de sécurité applicable doit être visible avant l’achat.", legalReference: article19, weight: 12, requiredWhen: "warningsApplicable" },
  { id: "warningsNotApplicableReason", label: "Justification de non-applicabilité", detail: "Si aucun avertissement n’est applicable, cette conclusion doit être justifiée dans le dossier.", legalReference: "Revue interne de l’analyse de risques", weight: 6, requiredWhen: "warningsNotApplicable" },
  { id: "language", label: "Langue du marché ciblé", detail: "Les avertissements et informations de sécurité doivent être compréhensibles sur le marché ciblé.", legalReference: article19, weight: 6 },
  { id: "traceabilityImage", label: "Image du produit", detail: "L’offre à distance doit inclure une image permettant d’identifier le produit.", legalReference: article19, weight: 12 },
];

function hasValue(input: EcommerceListingInput, id: keyof EcommerceListingInput) {
  const value = input[id];
  if (typeof value === "boolean") return value;
  const trimmed = value.trim();
  if (id === "manufacturerElectronicAddress" || id === "responsiblePersonElectronicAddress") {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed) || /^https:\/\/[^\s]+$/i.test(trimmed);
  }
  if (id === "manufacturerPostalAddress" || id === "responsiblePersonPostalAddress" || id === "warningsNotApplicableReason") return trimmed.length >= 8;
  return trimmed.length > 1;
}

export function auditEcommerceListing(input: EcommerceListingInput, manufacturerInEu: boolean): EcommerceAuditResult {
  const findings = checks.map((check): EcommerceFinding => {
    const required = check.requiredWhen === "manufacturerOutsideEu" ? !manufacturerInEu
      : check.requiredWhen === "warningsApplicable" ? input.warningsApplicable
        : check.requiredWhen === "warningsNotApplicable" ? !input.warningsApplicable
          : true;
    const present = hasValue(input, check.id);
    if (present) return { ...check, status: "pass" };
    if (!required) return { ...check, status: "warning", detail: `${check.detail} Non applicable d’après les informations déclarées, à confirmer lors de la revue.` };
    return { ...check, status: "fail" };
  });

  const requiredWeight = findings.reduce((sum, item) => sum + (item.status === "warning" ? 0 : item.weight), 0);
  const passedWeight = findings.reduce((sum, item) => sum + (item.status === "pass" ? item.weight : 0), 0);
  const score = Math.max(0, Math.min(100, Math.round((passedWeight / Math.max(requiredWeight, 1)) * 100)));
  const blocking = findings.some((item) => item.status === "fail");
  const status = blocking ? "blocking" : score >= 90 ? "compliant" : "review";
  const failures = findings.filter((item) => item.status === "fail").length;

  return {
    score,
    status,
    findings,
    summary: failures === 0 ? "Les mentions essentielles sont présentes. Une validation humaine reste nécessaire." : `${failures} mention${failures > 1 ? "s" : ""} obligatoire${failures > 1 ? "s" : ""} à compléter avant publication.`,
  };
}
