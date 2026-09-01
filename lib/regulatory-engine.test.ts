import { describe, expect, it } from "vitest";
import { assessRegulatoryProfile, buildRegulatoryActionPlan, REGULATORY_ENGINE_VERSION } from "./regulatory-engine";

describe("regulatory engine", () => {
  it("is versioned", () => {
    expect(REGULATORY_ENGINE_VERSION).toBe("eu-core-2026-09-01-v2");
  });

  it("never declares LVD automatically applicable from category alone", () => {
    const result = assessRegulatoryProfile({ category: "Équipement électrique", sector: "consumer", intendedForConsumers: true });
    expect(result.find((item) => item.regulationCode === "2014/35/EU")?.outcome).toBe("needs_information");
  });

  it("requires human review even when LVD voltage is in its main range", () => {
    const result = assessRegulatoryProfile({ category: "Équipement électrique", sector: "consumer", intendedForConsumers: true, nominalVoltageAc: 230, electricalElectronicEquipment: true });
    expect(result.find((item) => item.regulationCode === "2014/35/EU")?.outcome).toBe("human_review");
  });

  it("treats an explicitly non-radio product as RED not applicable", () => {
    const result = assessRegulatoryProfile({ category: "Équipement électrique", sector: "consumer", emitsOrReceivesRadio: false });
    expect(result.find((item) => item.regulationCode === "2014/53/EU")?.outcome).toBe("not_applicable");
  });

  it("models WEEE separately from RoHS for EEE", () => {
    const result = assessRegulatoryProfile({ category: "Équipement électrique", sector: "consumer", electricalElectronicEquipment: true });
    expect(result.find((item) => item.regulationCode === "2012/19/EU")?.outcome).toBe("human_review");
    expect(result.some((item) => item.regulationCode === "2011/65/EU")).toBe(true);
  });

  it("covers batteries incorporated into products without declaring compliance", () => {
    const result = assessRegulatoryProfile({ category: "Équipement électrique", sector: "consumer", containsBattery: true });
    const battery = result.find((item) => item.regulationCode === "EU 2023/1542");
    expect(battery?.outcome).toBe("human_review");
    expect(battery?.sourceReference).toContain("Article 1");
  });

  it("models PPWR as current from August 2026 when packaging is declared", () => {
    const result = assessRegulatoryProfile({ category: "Mobilier", sector: "consumer", packagedProduct: true });
    const packaging = result.find((item) => item.regulationCode === "EU 2025/40");
    expect(packaging?.outcome).toBe("human_review");
    expect(packaging?.rationale).toContain("12 août 2026");
  });

  it("keeps construction DPP pending instead of creating a current obligation", () => {
    const result = assessRegulatoryProfile({ category: "Produit de construction", sector: "construction", constructionProduct: true });
    const dpp = result.find((item) => item.regulationCode === "EU 2024/3110-DPP");
    expect(dpp?.outcome).toBe("needs_information");
    expect(dpp?.sourceReference).toContain("75");
  });

  it("does not universalise the ESPR DPP without a product delegated act", () => {
    const result = assessRegulatoryProfile({ category: "Mobilier", sector: "consumer" });
    const espr = result.find((item) => item.regulationCode === "EU 2024/1781");
    expect(espr?.outcome).toBe("human_review");
    expect(espr?.rationale).toContain("acte délégué");
  });

  it("models the machinery transition explicitly", () => {
    const result = assessRegulatoryProfile({ category: "Machine", sector: "consumer", machinery: true });
    expect(result.some((item) => item.regulationCode === "2006/42/EC")).toBe(true);
    expect(result.some((item) => item.regulationCode === "EU 2023/1230")).toBe(true);
  });

  it("models the toy transition to Regulation 2025/2509 without applying it early", () => {
    const result = assessRegulatoryProfile({ category: "Jouet", sector: "consumer", toy: true });
    const current = result.find((item) => item.regulationCode === "2009/48/EC");
    const future = result.find((item) => item.regulationCode === "EU 2025/2509");
    expect(current?.rationale).toContain("1er août 2030");
    expect(future?.outcome).toBe("human_review");
    expect(future?.rationale).toContain("1er août 2030");
  });

  it("does not turn GPSR into an automatic certification decision", () => {
    const result = assessRegulatoryProfile({ category: "Mobilier", sector: "consumer", intendedForConsumers: true });
    expect(result.find((item) => item.regulationCode === "EU 2023/988")?.outcome).toBe("human_review");
  });

  it("creates a blocking GPSR responsible-person action for a non-EU manufacturer without EU operator", () => {
    const profile = { category: "Mobilier", sector: "consumer" as const, intendedForConsumers: true, manufacturerEstablishedInEu: false, euResponsiblePersonIdentified: false };
    const actions = buildRegulatoryActionPlan(profile, assessRegulatoryProfile(profile));
    expect(actions.find((item) => item.actionKey === "gpsr-eu-responsible-person")?.severity).toBe("blocking");
  });

  it("creates a distance-sale Article 19 action when online sales are declared", () => {
    const profile = { category: "Mobilier", sector: "consumer" as const, intendedForConsumers: true, distanceSale: true };
    const actions = buildRegulatoryActionPlan(profile, assessRegulatoryProfile(profile));
    const action = actions.find((item) => item.actionKey === "gpsr-distance-sale-offer");
    expect(action?.sourceReference).toBe("Article 19");
    expect(action?.severity).toBe("high");
  });
});
