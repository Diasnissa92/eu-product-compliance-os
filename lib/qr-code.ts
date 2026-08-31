import QRCode from "qrcode";

export const passportQrOptions = {
  width: 360,
  margin: 3,
  errorCorrectionLevel: "Q" as const,
  color: { dark: "#082A35", light: "#FFFFFF" },
};

export async function createPassportQrDataUrl(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    throw new Error("Le passeport doit utiliser une adresse HTTPS.");
  }
  return QRCode.toDataURL(parsed.toString(), passportQrOptions);
}
