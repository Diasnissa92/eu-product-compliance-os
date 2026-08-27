import { describe, expect, it } from "vitest";
import { getSafeAuthDestination } from "../lib/auth/redirects";

describe("auth callback redirects", () => {
  it("keeps an internal invitation destination", () => {
    expect(getSafeAuthDestination("/team")).toBe("/team");
  });

  it("falls back when no destination is supplied", () => {
    expect(getSafeAuthDestination(null)).toBe("/onboarding");
  });

  it("rejects protocol-relative destinations", () => {
    expect(getSafeAuthDestination("//malicious.example")).toBe("/onboarding");
  });

  it("rejects absolute external destinations", () => {
    expect(getSafeAuthDestination("https://malicious.example")).toBe("/onboarding");
  });
});
