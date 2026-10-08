/**
 * Strip leading standalone page number from each page.
 * Prevents page numbers from gluing onto text across page boundaries.
 * 
 * @param {string[]} pages - Array of extracted page texts (1-indexed by array index + 1)
 * @returns {string[]} Cleaned page strings
 */
export function stripPageNumbers(pages) {
  if (!Array.isArray(pages)) return [];

  return pages.map((pageText, idx) => {
    if (!pageText) return "";
    const pageNum = idx + 1;
    // Match leading standalone page number at the start of the page
    // E.g., "1\n", "  1  \n", "18\r\n"
    const regex = new RegExp(`^\\s*${pageNum}\\s*(\\r?\\n|$)`, "m");
    return pageText.replace(regex, "");
  });
}
