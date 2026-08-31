import { describe, expect, it } from "vitest";
import { readBearerRuntimeSecret } from "@/lib/runtime-secret";

describe("authentification des tâches planifiées", () => {
  it("accepte uniquement un secret hexadécimal de 256 bits", () => {
    const secret = "a".repeat(64);
    expect(readBearerRuntimeSecret(`Bearer ${secret}`)).toBe(secret);
  });

  it.each([
    null,
    "",
    "bearer " + "a".repeat(64),
    "Bearer " + "A".repeat(64),
    "Bearer " + "a".repeat(63),
    "Bearer " + "a".repeat(65),
    "Bearer secret",
    "Basic " + "a".repeat(64),
  ])("refuse un en-tête non conforme (%s)", (authorization) => {
    expect(readBearerRuntimeSecret(authorization)).toBeNull();
  });
});
