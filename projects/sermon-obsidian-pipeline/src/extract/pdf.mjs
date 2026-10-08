import { readFile } from "node:fs/promises";
// Import internal lib directly to avoid pdf-parse index.js running test code under ESM
// (module.parent is undefined in ESM, triggering the debug block in pdf-parse/index.js)
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { stripPageNumbers } from "../clean/pages.mjs";

/**
 * Extract per-page text from a PDF file using pdf-parse.
 * Automatically strips leading standalone page numbers per page.
 * 
 * @param {string} filePath - Absolute path to PDF file
 * @returns {Promise<{ pages: string[], text: string }>}
 */
export async function extractPdf(filePath) {
  const buffer = await readFile(filePath);
  const rawPages = [];

  function customPageRender(pageData) {
    return pageData.getTextContent().then((tc) => {
      let lastY, text = "";
      for (const item of tc.items) {
        if (lastY === item.transform[5] || !lastY) {
          text += item.str;
        } else {
          text += "\n" + item.str;
        }
        lastY = item.transform[5];
      }
      rawPages.push(text);
      return text;
    });
  }

  await pdfParse(buffer, { pagerender: customPageRender });

  const cleanedPages = stripPageNumbers(rawPages);
  const combinedText = cleanedPages.join("\n\n");

  return {
    pages: cleanedPages,
    text: combinedText,
    pageCount: cleanedPages.length,
  };
}
