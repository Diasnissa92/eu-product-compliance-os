export type RegulatoryOutcome = "applicable" | "not_applicable" | "needs_information" | "human_review";
export type RegulatoryActionKind = "information" | "review" | "evidence";
export type RegulatoryActionSeverity = "medium" | "high" | "blocking";

export type RegulatoryProfile = {
  category: string;
  sector: "consumer" | "construction";
  intendedForConsumers?: boolean;
  distanceSale?: boolean;
  manufacturerEstablishedInEu?: boolean;
  euResponsiblePersonIdentified?: boolean;
  nominalVoltageAc?: number | null;
  nominalVoltageDc?: number | null;
  emitsOrReceivesRadio?: boolean | null;
  electricalElectronicEquipment?: boolean | null;
  containsBattery?: boolean | null;
  packagedProduct?: boolean | null;
  toy?: boolean | null;
  ppe?: boolean | null;
  machinery?: boolean | null;
  constructionProduct?: boolean | null;
};

export type RegulatoryAssessment = {
  regulationCode: string;
  title: string;
  outcome: RegulatoryOutcome;
  rationale: string;
  sourceUrl: string;
  sourceReference: string;
};

export type RegulatoryActionDraft = {
  actionKey: string;
  regulationCode: string;
  title: string;
  kind: RegulatoryActionKind;
  severity: RegulatoryActionSeverity;
  rationale: string;
  sourceUrl: string;
  sourceReference: string;
};

export const REGULATORY_ENGINE_VERSION = "eu-core-2026-09-01-v2";

const sources = {
  gpsr: "https://eur-lex.europa.eu/eli/reg/2023/988/oj",
  lvd: "https://eur-lex.europa.eu/eli/dir/2014/35/oj",
  emc: "https://eur-lex.europa.eu/eli/dir/2014/30/oj",
  rohs: "https://eur-lex.europa.eu/eli/dir/2011/65/oj",
  weee: "https://eur-lex.europa.eu/eli/dir/2012/19/oj",
  red: "https://eur-lex.europa.eu/eli/dir/2014/53/oj",
  batteries: "https://eur-lex.europa.eu/eli/reg/2023/1542/oj",
  packaging: "https://eur-lex.europa.eu/eli/reg/2025/40/oj",
  toysDirective: "https://eur-lex.europa.eu/eli/dir/2009/48/oj",
  toysRegulation: "https://eur-lex.europa.eu/eli/reg/2025/2509/oj",
  ppe: "https://eur-lex.europa.eu/eli/reg/2016/425/oj",
  machineryDirective: "https://eur-lex.europa.eu/eli/dir/2006/42/oj",
  machineryRegulation: "https://eur-lex.europa.eu/eli/reg/2023/1230/oj",
  cpr: "https://eur-lex.europa.eu/eli/reg/2024/3110/oj",
  espr: "https://eur-lex.europa.eu/eli/reg/2024/1781/oj",
} as const;

function assessment(
  regulationCode: string,
  title: string,
  outcome: RegulatoryOutcome,
  rationale: string,
  sourceUrl: string,
  sourceReference: string,
): RegulatoryAssessment {
  return { regulationCode, title, outcome, rationale, sourceUrl, sourceReference };
}

function assessLvd(profile: RegulatoryProfile): RegulatoryAssessment {
  const electrical = profile.category === "Équipement électrique" || profile.electricalElectronicEquipment === true;
  if (!electrical) {
    return assessment("2014/35/EU", "Directive basse tension (LVD)", "not_applicable", "Aucun élément fourni n’identifie le produit comme équipement électrique relevant du contrôle de tension.", sources.lvd, "Articles 1 et 2");
  }
  if (profile.nominalVoltageAc == null && profile.nominalVoltageDc == null) {
    return assessment("2014/35/EU", "Directive basse tension (LVD)", "needs_information", "La plage de tension nominale n’est pas renseignée. Elle est indispensable pour examiner le champ principal de la LVD et ses exclusions.", sources.lvd, "Article 1 et Annexe II");
  }
  const acInRange = profile.nominalVoltageAc != null && profile.nominalVoltageAc >= 50 && profile.nominalVoltageAc <= 1000;
  const dcInRange = profile.nominalVoltageDc != null && profile.nominalVoltageDc >= 75 && profile.nominalVoltageDc <= 1500;
  if (!acInRange && !dcInRange) {
    return assessment("2014/35/EU", "Directive basse tension (LVD)", "human_review", "Les tensions fournies sont hors des limites principales de la LVD. Cela n’autorise pas à conclure qu’aucune autre législation électrique ne s’applique.", sources.lvd, "Article 1 et Annexe II");
  }
  return assessment("2014/35/EU", "Directive basse tension (LVD)", "human_review", "La tension fournie se situe dans les limites principales de la LVD. Les exclusions et la qualification exacte de l’équipement doivent encore être confirmées.", sources.lvd, "Article 1 et Annexe II");
}

function assessRadio(profile: RegulatoryProfile): RegulatoryAssessment {
  const explicitRadio = profile.emitsOrReceivesRadio ?? (profile.category === "Équipement radio" ? true : null);
  if (explicitRadio === false) return assessment("2014/53/EU", "Directive équipements radioélectriques (RED)", "not_applicable", "Le profil indique que le produit n’émet ni ne reçoit intentionnellement d’ondes radio à des fins de radiocommunication ou radiorepérage.", sources.red, "Article 2");
  if (explicitRadio == null) return assessment("2014/53/EU", "Directive équipements radioélectriques (RED)", "needs_information", "La présence d’une fonction radio n’est pas renseignée.", sources.red, "Article 2");
  return assessment("2014/53/EU", "Directive équipements radioélectriques (RED)", "human_review", "Une fonction radio est déclarée. Le champ d’application, les exclusions et les exigences essentielles doivent être confirmés.", sources.red, "Articles 2 et 3");
}

function assessRohs(profile: RegulatoryProfile): RegulatoryAssessment {
  const eee = profile.electricalElectronicEquipment ?? (["Équipement électrique", "Équipement radio"].includes(profile.category) ? true : null);
  if (eee === false) return assessment("2011/65/EU", "Directive RoHS", "not_applicable", "Le produit est déclaré comme n’étant pas un équipement électrique ou électronique.", sources.rohs, "Articles 2 et 3");
  if (eee == null) return assessment("2011/65/EU", "Directive RoHS", "needs_information", "Il faut déterminer si le produit correspond à la définition d’un équipement électrique ou électronique et vérifier les exclusions.", sources.rohs, "Articles 2 et 3");
  return assessment("2011/65/EU", "Directive RoHS", "human_review", "Le produit est identifié comme équipement électrique ou électronique. La catégorie, les exclusions et les éventuelles exemptions RoHS doivent être vérifiées.", sources.rohs, "Articles 2, 3 et 4");
}

function assessWeee(profile: RegulatoryProfile): RegulatoryAssessment {
  const eee = profile.electricalElectronicEquipment ?? (["Équipement électrique", "Équipement radio"].includes(profile.category) ? true : null);
  if (eee === false) return assessment("2012/19/EU", "Directive DEEE / WEEE", "not_applicable", "Le produit est déclaré comme n’étant pas un équipement électrique ou électronique.", sources.weee, "Article 2");
  if (eee == null) return assessment("2012/19/EU", "Directive DEEE / WEEE", "needs_information", "Il faut confirmer si le produit est un équipement électrique ou électronique au sens du champ ouvert de la directive DEEE.", sources.weee, "Article 2 et Annexes III-IV");
  return assessment("2012/19/EU", "Directive DEEE / WEEE", "human_review", "Le produit est déclaré électrique ou électronique. Depuis le 15 août 2018, le champ est ouvert sous réserve des exclusions ; la catégorie DEEE et les obligations nationales de producteur doivent être vérifiées.", sources.weee, "Article 2 et Annexes III-IV");
}

function assessEmc(profile: RegulatoryProfile): RegulatoryAssessment {
  const electrical = profile.electricalElectronicEquipment ?? (["Équipement électrique", "Équipement radio"].includes(profile.category) ? true : null);
  if (electrical === false) return assessment("2014/30/EU", "Directive compatibilité électromagnétique (EMC)", "not_applicable", "Aucune caractéristique électrique ou électronique n’est déclarée.", sources.emc, "Articles 1 et 2");
  if (electrical == null) return assessment("2014/30/EU", "Directive compatibilité électromagnétique (EMC)", "needs_information", "Les caractéristiques susceptibles de produire ou subir des perturbations électromagnétiques ne sont pas suffisamment renseignées.", sources.emc, "Articles 1 et 2");
  return assessment("2014/30/EU", "Directive compatibilité électromagnétique (EMC)", "human_review", "Le produit présente des caractéristiques électriques ou électroniques. Le champ d’application et les exclusions EMC doivent être confirmés, notamment en cas d’équipement radio.", sources.emc, "Articles 1 et 2");
}

function assessBattery(profile: RegulatoryProfile): RegulatoryAssessment {
  if (profile.containsBattery === false) return assessment("EU 2023/1542", "Règlement batteries", "not_applicable", "Le produit est déclaré sans batterie incorporée, ajoutée ou destinée à y être incorporée.", sources.batteries, "Article 1");
  if (profile.containsBattery == null) return assessment("EU 2023/1542", "Règlement batteries", "needs_information", "La présence d’une batterie n’est pas renseignée. Le règlement couvre aussi les batteries incorporées ou ajoutées à des produits.", sources.batteries, "Article 1, paragraphes 1 à 4");
  return assessment("EU 2023/1542", "Règlement batteries", "human_review", "Une batterie est déclarée. Le règlement 2023/1542 couvre les batteries incorporées aux produits ; la catégorie de batterie et les obligations applicables doivent être déterminées.", sources.batteries, "Article 1, paragraphes 1 à 4");
}

function assessPackaging(profile: RegulatoryProfile): RegulatoryAssessment {
  if (profile.packagedProduct === false) return assessment("EU 2025/40", "Règlement emballages et déchets d’emballages (PPWR)", "not_applicable", "Le produit est déclaré sans emballage mis à disposition sur le marché. Cette conclusion doit être revue si un emballage de transport, service ou vente est utilisé.", sources.packaging, "Articles 2 et 3");
  if (profile.packagedProduct == null) return assessment("EU 2025/40", "Règlement emballages et déchets d’emballages (PPWR)", "needs_information", "La présence et le rôle de l’emballage ne sont pas renseignés. Le PPWR s’applique depuis le 12 août 2026 à tous les emballages, sous réserve de ses dispositions particulières.", sources.packaging, "Articles 2 et 3 ; Article 71");
  return assessment("EU 2025/40", "Règlement emballages et déchets d’emballages (PPWR)", "human_review", "Le produit est déclaré emballé. Le PPWR est applicable depuis le 12 août 2026 ; le rôle de l’opérateur, la conformité de l’emballage, le marquage et les obligations de responsabilité élargie doivent être qualifiés.", sources.packaging, "Articles 2, 15 à 21 et 44 ; Article 71");
}

function assessSpecificProductRules(profile: RegulatoryProfile): RegulatoryAssessment[] {
  const results: RegulatoryAssessment[] = [];
  const toy = profile.toy ?? (profile.category === "Jouet" ? true : null);
  if (toy === true) {
    results.push(assessment("2009/48/EC", "Directive sécurité des jouets", "human_review", "Au 1er septembre 2026, la directive 2009/48/CE reste le cadre principal pour la mise sur le marché des jouets jusqu’au 1er août 2030.", sources.toysDirective, "Articles 1 et 2 ; transition jusqu’au 1er août 2030"));
    results.push(assessment("EU 2025/2509", "Règlement sécurité des jouets", "human_review", "Le règlement 2025/2509 est adopté et certaines dispositions sont déjà en vigueur, mais son application générale et le remplacement de la directive interviennent le 1er août 2030. La transition doit être préparée sans l’appliquer prématurément comme cadre principal.", sources.toysRegulation, "Article 56 et dispositions transitoires"));
  } else if (toy == null && profile.category === "Autre produit de consommation") {
    results.push(assessment("2009/48/EC", "Directive sécurité des jouets", "needs_information", "L’usage par des enfants de moins de 14 ans et la qualification éventuelle comme jouet ne sont pas renseignés.", sources.toysDirective, "Article 2"));
  }

  if (profile.ppe === true) results.push(assessment("EU 2016/425", "Règlement EPI", "human_review", "Le produit est déclaré comme équipement de protection individuelle. La définition, la catégorie de risque et les exclusions doivent être vérifiées.", sources.ppe, "Articles 2 et 3"));
  else if (profile.ppe == null) results.push(assessment("EU 2016/425", "Règlement EPI", "needs_information", "La fonction de protection individuelle n’est pas renseignée.", sources.ppe, "Articles 2 et 3"));

  if (profile.machinery === true) {
    results.push(assessment("2006/42/EC", "Directive Machines", "human_review", "Au 1er septembre 2026, la directive Machines 2006/42/CE reste le cadre principal applicable aux machines relevant de son champ jusqu’à l’application générale du règlement (UE) 2023/1230.", sources.machineryDirective, "Article 1"));
    results.push(assessment("EU 2023/1230", "Règlement Machines", "human_review", "Le règlement Machines 2023/1230 est en vigueur mais son application générale est prévue à partir du 14 janvier 2027. La transition doit être suivie pour les produits mis sur le marché autour de cette date.", sources.machineryRegulation, "Article 54"));
  } else if (profile.machinery == null) {
    results.push(assessment("2006/42/EC", "Directive Machines", "needs_information", "La qualification comme machine, quasi-machine ou produit connexe n’est pas renseignée.", sources.machineryDirective, "Article 1 et Article 2"));
  }

  const construction = profile.constructionProduct ?? (profile.sector === "construction" || profile.category === "Produit de construction" ? true : null);
  if (construction === true) {
    results.push(assessment("EU 2024/3110", "Règlement Produits de Construction (CPR)", "human_review", "Le produit est identifié comme produit de construction. L’applicabilité dépend notamment de la famille/catégorie de produit et des spécifications techniques pertinentes.", sources.cpr, "Articles 1 à 3"));
    results.push(assessment("EU 2024/3110-DPP", "Passeport numérique des produits de construction", "needs_information", "Le système DPP construction doit être établi par un acte délégué au titre de l’article 75. Les obligations ne doivent pas être générées automatiquement avant le calendrier déclenché par cet acte.", sources.cpr, "Articles 75, 76 et 80"));
  }
  return results;
}

function assessGpsr(profile: RegulatoryProfile): RegulatoryAssessment {
  if (profile.sector === "construction") {
    return assessment("EU 2023/988", "Règlement général sur la sécurité des produits (GPSR)", "human_review", "Un cadre sectoriel de construction est indiqué. Le GPSR peut interagir avec des règles sectorielles ; une revue du champ d’application est nécessaire plutôt qu’une conclusion automatique.", sources.gpsr, "Article 2");
  }
  if (profile.intendedForConsumers == null) {
    return assessment("EU 2023/988", "Règlement général sur la sécurité des produits (GPSR)", "needs_information", "Il faut confirmer si le produit est destiné aux consommateurs ou susceptible, dans des conditions raisonnablement prévisibles, d’être utilisé par eux, ainsi que les éventuelles exclusions ou règles sectorielles.", sources.gpsr, "Article 2");
  }
  if (profile.intendedForConsumers === false) {
    return assessment("EU 2023/988", "Règlement général sur la sécurité des produits (GPSR)", "human_review", "Le produit est déclaré non destiné aux consommateurs. Une revue reste nécessaire pour vérifier l’usage raisonnablement prévisible et les règles sectorielles applicables.", sources.gpsr, "Article 2");
  }
  return assessment("EU 2023/988", "Règlement général sur la sécurité des produits (GPSR)", "human_review", "Le produit est déclaré destiné aux consommateurs. Les exclusions, la personne responsable dans l’Union et l’articulation avec la législation sectorielle doivent être confirmées.", sources.gpsr, "Articles 2 et 16");
}

function assessEspr(profile: RegulatoryProfile): RegulatoryAssessment {
  if (profile.sector === "construction") {
    return assessment("EU 2024/1781", "Règlement écoconception des produits durables (ESPR)", "human_review", "Le cadre ESPR existe mais les exigences et passeports numériques deviennent contraignants par groupes de produits via des actes délégués. Il ne faut pas générer de DPP ESPR universel automatiquement.", sources.espr, "Articles 4 et 9 à 11");
  }
  return assessment("EU 2024/1781", "Règlement écoconception des produits durables (ESPR)", "human_review", "Le règlement établit le cadre pour de futures exigences d’écoconception et de passeport numérique par groupes de produits. Il faut vérifier l’existence d’un acte délégué couvrant précisément ce produit avant de matérialiser une obligation.", sources.espr, "Articles 4 et 9 à 11");
}

export function assessRegulatoryProfile(profile: RegulatoryProfile): RegulatoryAssessment[] {
  const results = [
    assessGpsr(profile),
    assessLvd(profile),
    assessEmc(profile),
    assessRohs(profile),
    assessWeee(profile),
    assessRadio(profile),
    assessBattery(profile),
    assessPackaging(profile),
    assessEspr(profile),
    ...assessSpecificProductRules(profile),
  ];
  const seen = new Set<string>();
  return results.filter((item) => {
    if (seen.has(item.regulationCode)) return false;
    seen.add(item.regulationCode);
    return true;
  });
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export function buildRegulatoryActionPlan(profile: RegulatoryProfile, results: RegulatoryAssessment[]): RegulatoryActionDraft[] {
  const actions: RegulatoryActionDraft[] = [];
  for (const result of results) {
    if (result.outcome === "not_applicable") continue;
    const kind: RegulatoryActionKind = result.outcome === "needs_information" ? "information" : result.outcome === "applicable" ? "evidence" : "review";
    actions.push({
      actionKey: `${slug(result.regulationCode)}-${kind}`,
      regulationCode: result.regulationCode,
      title: result.outcome === "needs_information" ? `Compléter la qualification — ${result.title}` : result.outcome === "applicable" ? `Constituer les preuves — ${result.title}` : `Valider le champ d’application — ${result.title}`,
      kind,
      severity: result.outcome === "needs_information" ? "medium" : "high",
      rationale: result.rationale,
      sourceUrl: result.sourceUrl,
      sourceReference: result.sourceReference,
    });
  }

  if (profile.intendedForConsumers === true && profile.manufacturerEstablishedInEu === false && profile.euResponsiblePersonIdentified !== true) {
    actions.push({
      actionKey: "gpsr-eu-responsible-person",
      regulationCode: "EU 2023/988",
      title: "Identifier la personne responsable établie dans l’Union",
      kind: "information",
      severity: "blocking",
      rationale: "Un produit couvert par le GPSR ne doit pas être mis sur le marché sans opérateur économique établi dans l’Union responsable des tâches prévues par le cadre de surveillance du marché.",
      sourceUrl: sources.gpsr,
      sourceReference: "Article 16",
    });
  }

  if (profile.intendedForConsumers === true && profile.distanceSale === true) {
    actions.push({
      actionKey: "gpsr-distance-sale-offer",
      regulationCode: "EU 2023/988",
      title: "Contrôler l’offre de vente à distance GPSR",
      kind: "evidence",
      severity: "high",
      rationale: "L’offre en ligne doit afficher clairement les informations fabricant, la personne responsable lorsque nécessaire, l’identification du produit et les avertissements ou informations de sécurité applicables.",
      sourceUrl: sources.gpsr,
      sourceReference: "Article 19",
    });
  }

  const unique = new Map<string, RegulatoryActionDraft>();
  for (const action of actions) unique.set(action.actionKey, action);
  return [...unique.values()];
}
