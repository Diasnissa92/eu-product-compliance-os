export type EcommerceListingInput = {
  title: string;
  productIdentifier: string;
  manufacturerName: string;
  manufacturerPostalAddress: string;
  manufacturerElectronicAddress: string;
  manufacturerElectronicAddressDirect: boolean;
  responsiblePersonName: string;
  responsiblePersonPostalAddress: string;
  responsiblePersonElectronicAddress: string;
  responsiblePersonElectronicAddressDirect: boolean;
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
  { id: "title", label: "Type / désignation du produit", detail: "L’offre doit indiquer le type du produit de façon à permettre son identification.", legalReference: article19, weight: 6 },
  { id: "productIdentifier", label: "Autre identifiant produit", detail: "Une référence, un modèle, un lot ou un autre identifiant permettant la traçabilité doit être visible.", legalReference: article19, weight: 12 },
  { id: "manufacturerName", label: "Nom du fabricant", detail: "Le nom, la raison sociale ou la marque enregistrée du fabricant doit apparaître.", legalReference: article19, weight: 9 },
  { id: "manufacturerPostalAddress", label: "Adresse postale du fabricant", detail: "L’adresse postale à laquelle le fabricant peut être contacté doit être visible avant l’achat.", legalReference: article19, weight: 10 },
  { id: "manufacturerElectronicAddress", label: "Adresse électronique du fabricant", detail: "Une adresse électronique permettant un contact direct doit être indiquée. Un site web statique ne suffit pas.", legalReference: article19, weight: 9 },
  { id: "responsiblePersonName", label: "Responsable dans l’Union européenne", detail: "Requis lorsque le fabricant n’est pas établi dans l’Union.", legalReference: article19, weight: 8, requiredWhen: "manufacturerOutsideEu" },
  { id: "responsiblePersonPostalAddress", label: "Adresse postale du responsable UE", detail: "Requise lorsque le fabricant n’est pas établi dans l’Union.", legalReference: article19, weight: 8, requiredWhen: "manufacturerOutsideEu" },
  { id: "responsiblePersonElectronicAddress", label: "Adresse électronique du responsable UE", detail: "Requise lorsque le fabricant n’est pas établi dans l’Union et doit permettre un contact direct.", legalReference: article19, weight: 8, requiredWhen: "manufacturerOutsideEu" },
  { id: "warnings", label: "Avertissements et informations de sécurité", detail: "Toute information de sécurité applicable doit être clairement et visiblement indiquée dans l’offre.", legalReference: article19, weight: 12, requiredWhen: "warningsApplicable" },
  { id: "warningsNotApplicableReason", label: "Justification de non-applicabilité", detail: "Si aucune information de sécurité spécifique n’est applicable, cette conclusion doit rester justifiée dans le dossier.", legalReference: "Revue interne de l’analyse de risques et des textes applicables", weight: 6, requiredWhen: "warningsNotApplicable" },
  { id: "language", label: "Langue des informations de sécurité", detail: "Lorsqu’elles sont requises, les informations de sécurité doivent être dans une langue facilement compréhensible par les consommateurs du marché concerné.", legalReference: article19, weight: 6, requiredWhen: "warningsApplicable" },
  { id: "traceabilityImage", label: "Image du produit", detail: "L’offre à distance doit inclure une image permettant d’identifier le produit.", legalReference: article19, weight: 12 },
];

function validElectronicAddress(value: string, directWebContactConfirmed: boolean) {
  const trimmed = value.trim();
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) return true;
  return /^https:\/\/[^\s]+$/i.test(trimmed) && directWebContactConfirmed;
}

function hasValue(input: EcommerceListingInput, id: keyof EcommerceListingInput) {
  if (id === "manufacturerElectronicAddress") {
    return validElectronicAddress(input.manufacturerElectronicAddress, input.manufacturerElectronicAddressDirect);
  }
  if (id === "responsiblePersonElectronicAddress") {
    return validElectronicAddress(input.responsiblePersonElectronicAddress, input.responsiblePersonElectronicAddressDirect);
  }
  const value = input[id];
  if (typeof value === "boolean") return value;
  const trimmed = value.trim();
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
    summary: failures === 0 ? "Les mentions contrôlées sont présentes. Une validation humaine des informations et des textes applicables reste nécessaire." : `${failures} mention${failures > 1 ? "s" : ""} obligatoire${failures > 1 ? "s" : ""} à compléter avant publication.`,
  };
}
