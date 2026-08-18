import type { AuditEvent, Product, ProductDocument, Requirement } from "@/lib/types";

const sharedAudit: AuditEvent[] = [
  {
    id: "audit-1",
    title: "Checklist recalculée",
    detail: "Le diagnostic a été mis à jour après la validation d’un document.",
    date: "Aujourd’hui, 09:42",
    actor: "Moteur de conformité",
  },
  {
    id: "audit-2",
    title: "Document ajouté",
    detail: "La déclaration UE de conformité a été ajoutée au coffre.",
    date: "Hier, 16:18",
    actor: "Sofia Martin",
  },
  {
    id: "audit-3",
    title: "Produit créé",
    detail: "Première qualification réglementaire enregistrée.",
    date: "12 août 2026",
    actor: "Hugo Dias",
  },
];

const lumaRequirements: Requirement[] = [
  {
    id: "req-ce",
    title: "Marquage CE et identification",
    description: "Le produit et son emballage portent un marquage CE lisible et durable.",
    regulation: "Décision 768/2008/CE",
    status: "verified",
    severity: "blocking",
    owner: "Sofia Martin",
  },
  {
    id: "req-doc",
    title: "Déclaration UE de conformité",
    description: "La déclaration identifie le fabricant, le produit et les textes applicables.",
    regulation: "Directive 2014/35/UE",
    status: "verified",
    severity: "blocking",
    owner: "Sofia Martin",
  },
  {
    id: "req-emc",
    title: "Essais de compatibilité électromagnétique",
    description: "Les rapports couvrent les normes harmonisées déclarées.",
    regulation: "Directive 2014/30/UE",
    status: "verified",
    severity: "high",
  },
  {
    id: "req-rohs",
    title: "Preuve RoHS",
    description: "Les substances restreintes sont couvertes par une déclaration matière.",
    regulation: "Directive 2011/65/UE",
    status: "verified",
    severity: "high",
  },
  {
    id: "req-manual",
    title: "Notice en langues locales",
    description: "Les avertissements et instructions sont disponibles pour les marchés ciblés.",
    regulation: "Règlement (UE) 2023/988",
    status: "verified",
    severity: "medium",
  },
];

const lumaDocuments: ProductDocument[] = [
  {
    id: "doc-1",
    name: "Déclaration UE de conformité.pdf",
    type: "Déclaration de conformité",
    status: "verified",
    uploadedAt: "17 août 2026",
    size: "1,8 Mo",
  },
  {
    id: "doc-2",
    name: "Rapport essais CEM — EN 55015.pdf",
    type: "Rapport de laboratoire",
    status: "verified",
    uploadedAt: "15 août 2026",
    expiresAt: "15 août 2029",
    size: "4,2 Mo",
  },
  {
    id: "doc-3",
    name: "Manuel utilisateur FR-DE-NL.pdf",
    type: "Notice",
    status: "verified",
    uploadedAt: "14 août 2026",
    size: "2,4 Mo",
  },
  {
    id: "doc-4",
    name: "Déclaration matières RoHS.xlsx",
    type: "Déclaration matière",
    status: "verified",
    uploadedAt: "12 août 2026",
    expiresAt: "12 février 2027",
    size: "840 Ko",
  },
];

function makeProduct(overrides: Partial<Product> & Pick<Product, "id" | "name" | "sku">): Product {
  return {
    category: "Équipement électrique",
    manufacturer: "Nordhavn Design ApS",
    originCountry: "Danemark",
    destinationMarkets: ["France", "Allemagne", "Belgique"],
    imageTone: "sage",
    status: "compliant",
    score: 100,
    updatedAt: "Il y a 18 min",
    frameworks: ["GPSR", "LVD", "EMC", "RoHS"],
    requirements: lumaRequirements,
    documents: lumaDocuments,
    audit: sharedAudit,
    ...overrides,
  };
}

export const products: Product[] = [
  makeProduct({ id: "luma-mini", name: "Lampe Luma Mini", sku: "LUM-204-FR" }),
  makeProduct({
    id: "pulse-air",
    name: "Écouteurs Pulse Air",
    sku: "PLS-AIR-02",
    category: "Équipement radio",
    manufacturer: "Shenzhen Wavelink Co.",
    originCountry: "Chine",
    imageTone: "blue",
    status: "risk",
    score: 64,
    updatedAt: "Il y a 2 h",
    nextDeadline: "22 août 2026",
    frameworks: ["GPSR", "RED", "RoHS", "REACH"],
    requirements: lumaRequirements.map((item, index) =>
      index === 2 ? { ...item, status: "rejected", regulation: "Directive 2014/53/UE" } : item,
    ),
  }),
  makeProduct({
    id: "tinysteps-wooden-set",
    name: "Jeu TinySteps 24 pcs",
    sku: "TS-WOOD-24",
    category: "Jouet",
    manufacturer: "Hangzhou Playworks Ltd.",
    originCountry: "Chine",
    imageTone: "amber",
    status: "blocking",
    score: 38,
    updatedAt: "Hier",
    nextDeadline: "Action immédiate",
    frameworks: ["GPSR", "Jouets", "REACH"],
    requirements: lumaRequirements.map((item, index) =>
      index === 0
        ? { ...item, title: "Rapport EN 71", status: "missing", regulation: "Directive 2009/48/CE" }
        : item,
    ),
  }),
  makeProduct({
    id: "steelflow-mixer",
    name: "Mitigeur SteelFlow",
    sku: "SF-MIX-440",
    category: "Produit de construction",
    manufacturer: "Metallo Casa Srl",
    originCountry: "Italie",
    imageTone: "slate",
    status: "incomplete",
    score: 78,
    updatedAt: "16 août 2026",
    nextDeadline: "28 août 2026",
    frameworks: ["GPSR", "CPR", "REACH"],
    requirements: lumaRequirements.map((item, index) =>
      index === 3 ? { ...item, status: "pending", title: "Déclaration de performance" } : item,
    ),
  }),
  makeProduct({
    id: "aura-diffuser",
    name: "Diffuseur Aura",
    sku: "AUR-DIF-100",
    category: "Équipement électrique",
    manufacturer: "Casa Forma Lda.",
    originCountry: "Portugal",
    imageTone: "rose",
    status: "compliant",
    score: 96,
    updatedAt: "15 août 2026",
    frameworks: ["GPSR", "LVD", "EMC", "RoHS"],
  }),
];

export function getProduct(productId: string): Product | undefined {
  return products.find((product) => product.id === productId);
}

export const portfolioStats = {
  total: products.length,
  compliant: products.filter((product) => product.status === "compliant").length,
  attention: products.filter((product) => product.status === "incomplete" || product.status === "risk").length,
  blocking: products.filter((product) => product.status === "blocking").length,
  documents: products.reduce((total, product) => total + product.documents.length, 0),
};
