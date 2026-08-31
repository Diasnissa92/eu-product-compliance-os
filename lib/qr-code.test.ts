import jsQR from "jsqr";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { createPassportQrDataUrl } from "@/lib/qr-code";

describe("QR code du passeport", () => {
  it("restitue exactement l’adresse publique après décodage", async () => {
    const expected = "https://eu-product-compliance-os.vercel.app/passport/EUCP-LUM-204-FR";
    const dataUrl = await createPassportQrDataUrl(expected);
    const png = PNG.sync.read(Buffer.from(dataUrl.split(",")[1], "base64"));
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);

    expect(decoded?.data).toBe(expected);
  });

  it("refuse une destination non sécurisée", async () => {
    await expect(createPassportQrDataUrl("http://example.com/passport/demo")).rejects.toThrow("HTTPS");
  });
});
