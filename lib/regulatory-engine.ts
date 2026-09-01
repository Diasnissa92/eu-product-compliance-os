export type RegulatoryOutcome = "applicable" | "not_applicable" | "needs_information" | "human_review";

export type RegulatoryProfile = {
  category: string;
  sector: "consumer" | "construction";
  intendedForConsumers?: boolean;
  nominalVoltageAc?: number | null;
  nominalVoltageDc?: number | null;
  emitsOrReceivesRadio?: boolean | null;
  electricalElectronicEquipment?: boolean | null;
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

export const REGULATORY_ENGINE_VERSION = "eu-core-2026-09-01-v1";

const sources = {
  gpsr: "https://eur-lex.europa.eu/eli/reg/2023/988/oj",
  lvd: "https://eur-lex.europa.eu/eli/dir/2014/35/oj",
  emc: "https://eur-lex.europa.eu/eli/dir/2014/30/oj",
  rohs: "https://eur-lex.europa.eu/eli/dir/2011/65/oj",
  red: "https://eur-lex.europa.eu/eli/dir/2014/53/oj",
  toys: "https://eur-lex.europa.eu/eli/dir/2009/48/oj",
  ppe: "https://eur-lex.europa.eu/eli/reg/2016/425/oj",
  machineryDirective: "https://eur-lex.europa.eu/eli/dir/2006/42/oj",
  machineryRegulation: "https://eur-lex.europa.eu/eli/reg/2023/1230/oj",
  cpr: "https://eur-lex.europa.eu/eli/reg/2024/3110/oj",
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
    return assessment("2014/35/EU", "Directive basse tension (LVD)", "not_applicable", "Aucun élément fourni n’identifie le produit comme équipement électrique relevant du contrôle de tension.", sources.lvd, "Article 1 et Article 2");
  }
  if (profile.nominalVoltageAc == null && profile.nominalVoltageDc == null) {
    return assessment("2014/35/EU", "Directive basse tension (LVD)", "needs_information", "La plage de tension nominale n’est pas renseignée. La LVD vise notamment les équipements conçus pour certaines limites de tension et comporte des exclusions qui doivent être vérifiées.", sources.lvd, "Article 1");
  }
  const acInRange = profile.nominalVoltageAc != null && profile.nominalVoltageAc >= 50 && profile.nominalVoltageAc <= 1000;
  const dcInRange = profile.nominalVoltageDc != null && profile.nominalVoltageDc >= 75 && profile.nominalVoltageDc <= 1500;
  if (!acInRange && !dcInRange) {
    return assessment("2014/35/EU", "Directive basse tension (LVD)", "human_review", "Les tensions fournies sont hors des limites principales de la LVD. Une revue reste nécessaire pour confirmer la qualification du produit et les autres textes applicables.", sources.lvd, "Article 1");
  }
  return assessment("2014/35/EU", "Directive basse tension (LVD)", "human_review", "La tension fournie se situe dans les limites principales de la LVD. Les exclusions et la qualification exacte de l’équipement doivent encore être confirmées avant de conclure à l’applicabilité.", sources.lvd, "Article 1 et Annexe II");
}

function assessRadio(profile: RegulatoryProfile): RegulatoryAssessment {
  const explicitRadio = profile.emitsOrReceivesRadio ?? (profile.category === "Équipement radio" ? true : null);
  if (explicitRadio === false) return assessment("2014/53/EU", "Directive équipements radioélectriques (RED)", "not_applicable", "Le profil indique que le produit n’émet ni ne reçoit intentionnellement d’ondes radio à des fins de radiocommunication ou radiorepérage.", sources.red, "Article 2");
  if (explicitRadio == null) return assessment("2014/53/EU", "Directive équipements radioélectriques (RED)", "needs_information", "La présence d’une fonction radio n’est pas renseignée.", sources.red, "Article 2");
  return assessment("2014/53/EU", "Directive équipements radioélectriques (RED)", "human_review", "Une fonction radio est déclarée. Le champ d’application, les exclusions et les exigences particulières de la RED doivent être confirmés avant de conclure.", sources.red, "Articles 2 et 3");
}

function assessRohs(profile: RegulatoryProfile): RegulatoryAssessment {
  const eee = profile.electricalElectronicEquipment ?? (["Équipement électrique", "Équipement radio"].includes(profile.category) ? true : null);
  if (eee === false) return assessment("2011/65/EU", "Directive RoHS", "not_applicable", "Le produit est déclaré comme n’étant pas un équipement électrique ou électronique.", sources.rohs, "Articles 2 et 3");
  if (eee == null) return assessment("2011/65/EU", "Directive RoHS", "needs_information", "Il faut déterminer si le produit correspond à la définition d’un équipement électrique ou électronique et vérifier les exclusions.", sources.rohs, "Articles 2 et 3");
  return assessment("2011/65/EU", "Directive RoHS", "human_review", "Le produit est identifié comme équipement électrique ou électronique. La catégorie, les exclusions et les éventuelles exemptions RoHS doivent être vérifiées.", sources.rohs, "Articles 2, 3 et 4");
}

function assessEmc(profile: RegulatoryProfile): RegulatoryAssessment {
  const electrical = profile.electricalElectronicEquipment ?? (["Équipement électrique", "Équipement radio"].includes(profile.category) ? true : null);
  if (electrical === false) return assessment("2014/30/EU", "Directive compatibilité électromagnétique (EMC)", "not_applicable", "Aucune caractéristique électrique ou électronique n’est déclarée.", sources.emc, "Articles 1 et 2");
  if (electrical == null) return assessment("2014/30/EU", "Directive compatibilité électromagnétique (EMC)", "needs_information", "Les caractéristiques susceptibles de produire ou subir des perturbations électromagnétiques ne sont pas suffisamment renseignées.", sources.emc, "Articles 1 et 2");
  return assessment("2014/30/EU", "Directive compatibilité électromagnétique (EMC)", "human_review", "Le produit présente des caractéristiques électriques ou électroniques. Le champ d’application et les exclusions EMC doivent être confirmés, notamment en cas d’équipement radio.", sources.emc, "Articles 1 et 2");
}

function assessSpecificProductRules(profile: RegulatoryProfile): RegulatoryAssessment[] {
  const results: RegulatoryAssessment[] = [];
  const toy = profile.toy ?? (profile.category === "Jouet" ? true : null);
  if (toy === true) results.push(assessment("2009/48/EC", "Directive sécurité des jouets", "human_review", "Le produit est déclaré comme jouet. L’usage prévu, l’âge des utilisateurs et les exclusions doivent être confirmés avant de conclure.", sources.toys, "Articles 1 et 2"));
  else if (toy == null && profile.category === "Autre produit de consommation") results.push(assessment("2009/48/EC", "Directive sécurité des jouets", "needs_information", "L’usage par des enfants et la qualification éventuelle comme jouet ne sont pas renseignés.", sources.toys, "Article 2"));

  if (profile.ppe === true) results.push(assessment("EU 2016/425", "Règlement EPI", "human_review", "Le produit est déclaré comme équipement de protection individuelle. La définition, la catégorie de risque et les exclusions doivent être vérifiées.", sources.ppe, "Articles 2 et 3"));

  if (profile.machinery === true) {
    results.push(assessment("2006/42/EC", "Directive Machines", "human_review", "Au 1er septembre 2026, la directive Machines 2006/42/CE reste le cadre principal applicable aux machines relevant de son champ jusqu’à l’application générale du règlement (UE) 2023/1230.", sources.machineryDirective, "Article 1"));
    results.push(assessment("EU 2023/1230", "Règlement Machines", "human_review", "Le règlement Machines 2023/1230 est en vigueur mais son application générale est prévue à partir du 14 janvier 2027. La transition doit être suivie pour les produits mis sur le marché autour de cette date.", sources.machineryRegulation, "Article 54"));
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
  return assessment("EU 2023/988", "Règlement général sur la sécurité des produits (GPSR)", "human_review", "Le produit est déclaré destiné aux consommateurs. Il faut encore vérifier les exclusions et l’articulation avec la législation sectorielle avant de conclure à l’étendue exacte des obligations GPSR.", sources.gpsr, "Article 2");
}

export function assessRegulatoryProfile(profile: RegulatoryProfile): RegulatoryAssessment[] {
  const results = [assessGpsr(profile), assessLvd(profile), assessEmc(profile), assessRohs(profile), assessRadio(profile), ...assessSpecificProductRules(profile)];
  const seen = new Set<string>();
  return results.filter((item) => {
    if (seen.has(item.regulationCode)) return false;
    seen.add(item.regulationCode);
    return true;
  });
}
