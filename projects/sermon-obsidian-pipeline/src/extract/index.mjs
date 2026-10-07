import path from "node:path";
import { extractPdf } from "./pdf.mjs";
import { extractDocx } from "./docx.mjs";
import { extractDoc } from "./doc.mjs";

/**
 * Extract text and page count from supported document formats (.pdf, .docx, .doc).
 * 
 * @param {string} filePath - Absolute path to document
 * @returns {Promise<{ pages: string[], text: string, pageCount: number }>}
 */
export async function extractDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".pdf":
      return extractPdf(filePath);
    case ".docx":
      return extractDocx(filePath);
    case ".doc":
      return extractDoc(filePath);
    default:
      throw new Error(`Unsupported document extension: ${ext} for file ${filePath}`);
  }
}
