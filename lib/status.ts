import type { ComplianceStatus, RequirementStatus } from "@/lib/types";

export const complianceStatusCopy: Record<
  ComplianceStatus,
  { label: string; shortLabel: string; description: string }
> = {
  compliant: {
    label: "Conforme",
    shortLabel: "Conforme",
    description: "Les exigences enregistrées sont couvertes par des preuves vérifiées.",
  },
  incomplete: {
    label: "À compléter",
    shortLabel: "À compléter",
    description: "Des preuves ou validations restent à fournir.",
  },
  risk: {
    label: "Risque détecté",
    shortLabel: "Risque",
    description: "Une preuve a été rejetée ou nécessite une revue approfondie.",
  },
  blocking: {
    label: "Commercialisation bloquée",
    shortLabel: "Bloquant",
    description: "Une exigence indispensable n’est pas couverte.",
  },
};

export const requirementStatusCopy: Record<RequirementStatus, string> = {
  verified: "Vérifié",
  pending: "En revue",
  missing: "Manquant",
  rejected: "Rejeté",
  "not-applicable": "Non applicable",
};
