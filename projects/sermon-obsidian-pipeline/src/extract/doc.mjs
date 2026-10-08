import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Extract raw text from legacy .doc binary files using macOS textutil.
 * 
 * @param {string} filePath - Absolute path to DOC file
 * @returns {Promise<{ pages: string[], text: string, pageCount: number }>}
 */
export async function extractDoc(filePath) {
  try {
    const { stdout } = await execFileAsync("textutil", ["-convert", "txt", filePath, "-stdout"]);
    const text = (stdout || "").trim();
    return {
      pages: [text],
      text,
      pageCount: 1,
    };
  } catch (err) {
    throw new Error(`macOS textutil extraction failed for ${filePath}: ${err.message}`);
  }
}
