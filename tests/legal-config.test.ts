import { describe, expect, it } from "vitest";
import { getMissingLegalFields, isLegalLaunchReady } from "../lib/legal-config";

describe("legal launch readiness", () => {
  it("blocks launch when legal identity is incomplete", () => {
    const config = { entityName: "UE Conformité", address: "", email: "contact@example.test", registration: "", vatNumber: "" };
    expect(isLegalLaunchReady(config)).toBe(false);
    expect(getMissingLegalFields(config)).toEqual(["address", "registration", "vatNumber"]);
  });

  it("allows launch only when every legal field is present", () => {
    const config = { entityName: "UE Conformité SAS", address: "1 rue Exemple, Paris", email: "contact@example.test", registration: "RCS EXAMPLE", vatNumber: "FR00000000000" };
    expect(isLegalLaunchReady(config)).toBe(true);
  });
});
