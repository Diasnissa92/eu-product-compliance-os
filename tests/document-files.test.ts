import { describe, expect, it } from "vitest";
import { MAX_DOCUMENT_FILE_SIZE, safeDocumentFileName, validateDocumentFile } from "@/lib/document-files";

describe("document file safeguards", () => {
  it("accepts a valid PDF", () => {
    expect(validateDocumentFile({ name: "rapport.pdf", size: 1200, type: "application/pdf" })).toEqual({ valid: true, contentType: "application/pdf" });
  });

  it("rejects empty and oversized files", () => {
    expect(validateDocumentFile({ name: "vide.pdf", size: 0, type: "application/pdf" }).valid).toBe(false);
    expect(validateDocumentFile({ name: "lourd.pdf", size: MAX_DOCUMENT_FILE_SIZE + 1, type: "application/pdf" }).valid).toBe(false);
  });

  it("detects a known MIME type disguised with another extension", () => {
    expect(validateDocumentFile({ name: "photo.pdf", size: 1200, type: "image/jpeg" }).valid).toBe(false);
  });

  it("allows an absent browser MIME type for a known extension", () => {
    expect(validateDocumentFile({ name: "preuve.docx", size: 1200, type: "" }).valid).toBe(true);
  });

  it("normalizes unsafe storage names", () => {
    expect(safeDocumentFileName("Déclaration UE / finale.pdf")).toBe("Declaration-UE-finale.pdf");
  });
});
