export const MAX_DOCUMENT_FILE_SIZE = 25 * 1024 * 1024;

export const documentMimeTypes: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function documentExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function validateDocumentFile(file: { name: string; size: number; type: string }) {
  const contentType = documentMimeTypes[documentExtension(file.name)];
  if (!contentType) return { valid: false as const, error: "Format non accepté. Utilisez un PDF, Word, Excel, JPG, PNG ou WebP." };
  if (file.size === 0) return { valid: false as const, error: "Ce fichier est vide. Sélectionnez un document contenant des données." };
  if (file.size > MAX_DOCUMENT_FILE_SIZE) return { valid: false as const, error: "Ce fichier dépasse la limite de 25 Mo." };
  const knownTypes = new Set(Object.values(documentMimeTypes));
  if (file.type && knownTypes.has(file.type) && file.type !== contentType) {
    return { valid: false as const, error: "Le contenu du fichier ne correspond pas à son extension. Vérifiez le document avant de le renvoyer." };
  }
  return { valid: true as const, contentType };
}

export function safeDocumentFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "document";
}
