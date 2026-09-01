import { describe, expect, it } from "vitest";
import { assessRegulatoryProfile, REGULATORY_ENGINE_VERSION } from "./regulatory-engine";

describe("regulatory engine", () => {
  it("is versioned", () => {
    expect(REGULATORY_ENGINE_VERSION).toBe("eu-core-2026-09-01-v1");
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

  it("keeps construction DPP pending instead of creating a current obligation", () => {
    const result = assessRegulatoryProfile({ category: "Produit de construction", sector: "construction", constructionProduct: true });
    const dpp = result.find((item) => item.regulationCode === "EU 2024/3110-DPP");
    expect(dpp?.outcome).toBe("needs_information");
    expect(dpp?.sourceReference).toContain("75");
  });

  it("models the machinery transition explicitly", () => {
    const result = assessRegulatoryProfile({ category: "Machine", sector: "consumer", machinery: true });
    expect(result.some((item) => item.regulationCode === "2006/42/EC")).toBe(true);
    expect(result.some((item) => item.regulationCode === "EU 2023/1230")).toBe(true);
  });

  it("does not turn GPSR into an automatic certification decision", () => {
    const result = assessRegulatoryProfile({ category: "Mobilier", sector: "consumer", intendedForConsumers: true });
    expect(result.find((item) => item.regulationCode === "EU 2023/988")?.outcome).toBe("human_review");
  });
});
