import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyStripeSignature } from "./stripe-rest";

describe("Stripe webhook verification", () => {
  it("accepts a valid v1 signature within tolerance", () => {
    const secret = "whsec_test_secret";
    const timestamp = 1_788_261_200;
    const body = '{"id":"evt_test","type":"customer.subscription.updated"}';
    const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
    expect(verifyStripeSignature(body, `t=${timestamp},v1=${signature}`, secret, timestamp + 30)).toBe(true);
  });

  it("rejects an expired signature", () => {
    const secret = "whsec_test_secret";
    const timestamp = 1_788_261_200;
    const body = "{}";
    const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
    expect(verifyStripeSignature(body, `t=${timestamp},v1=${signature}`, secret, timestamp + 301)).toBe(false);
  });

  it("rejects tampered content", () => {
    const secret = "whsec_test_secret";
    const timestamp = 1_788_261_200;
    const signature = createHmac("sha256", secret).update(`${timestamp}.original`).digest("hex");
    expect(verifyStripeSignature("tampered", `t=${timestamp},v1=${signature}`, secret, timestamp)).toBe(false);
  });
});
