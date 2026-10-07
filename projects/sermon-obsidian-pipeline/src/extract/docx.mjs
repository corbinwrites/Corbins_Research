import mammoth from "mammoth";

/**
 * Extract raw text from a DOCX file using mammoth.
 * 
 * @param {string} filePath - Absolute path to DOCX file
 * @returns {Promise<{ pages: string[], text: string, pageCount: number }>}
 */
export async function extractDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  const text = (result.value || "").trim();
  return {
    pages: [text],
    text,
    pageCount: 1,
  };
}
