import fs from "node:fs";
import path from "node:path";
import { BIBLE_DIR } from "../config.mjs";

class VaultIndex {
  constructor(bibleDir = BIBLE_DIR) {
    this.bibleDir = bibleDir;
    this.indexed = false;
    this.warnedMissing = false;
    // Map: "<abbrev> <chapter>" -> Set of verse numbers
    this.chapters = new Map();
    // Map: "<folder>/<chapter>" -> Set of verse numbers
    this.folderChapters = new Map();
  }

  init() {
    if (this.indexed) return;
    this.indexed = true;

    try {
      if (!fs.existsSync(this.bibleDir)) {
        if (!this.warnedMissing) {
          console.warn(`[VaultIndex] ESV Bible directory not found at ${this.bibleDir}. Verse validation will be bypassed.`);
          this.warnedMissing = true;
        }
        return;
      }

      const bookDirs = fs.readdirSync(this.bibleDir);
      for (const dir of bookDirs) {
        const dirPath = path.join(this.bibleDir, dir);
        if (!fs.statSync(dirPath).isDirectory()) continue;

        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          if (!file.endsWith(".md") || file.startsWith(".")) continue;
          const match = file.match(/^(.+?)\s+(\d+)\.md$/);
          if (!match) continue;

          const abbrev = match[1];
          const chapter = parseInt(match[2], 10);
          const content = fs.readFileSync(path.join(dirPath, file), "utf-8");

          const verses = new Set();
          const verseMatches = content.matchAll(/^######\s+(\d+)/gm);
          for (const vm of verseMatches) {
            verses.add(parseInt(vm[1], 10));
          }

          this.chapters.set(`${abbrev} ${chapter}`, verses);
          this.folderChapters.set(`${dir}/${chapter}`, verses);
        }
      }
    } catch (err) {
      if (!this.warnedMissing) {
        console.warn(`[VaultIndex] Failed to index Bible vault: ${err.message}. Validation bypassed.`);
        this.warnedMissing = true;
      }
    }
  }

  isAvailable() {
    this.init();
    return this.chapters.size > 0;
  }

  hasChapter(bookAbbrevOrFolder, chapter) {
    this.init();
    if (!this.isAvailable()) return true; // bypass if vault unavailable
    return (
      this.chapters.has(`${bookAbbrevOrFolder} ${chapter}`) ||
      this.folderChapters.has(`${bookAbbrevOrFolder}/${chapter}`)
    );
  }

  hasVerse(bookAbbrev, chapter, verse) {
    this.init();
    if (!this.isAvailable()) return true; // bypass if vault unavailable
    const verses = this.chapters.get(`${bookAbbrev} ${chapter}`);
    if (!verses) return false;
    return verses.has(verse);
  }

  getMaxVerse(bookAbbrev, chapter) {
    this.init();
    const verses = this.chapters.get(`${bookAbbrev} ${chapter}`);
    if (!verses || verses.size === 0) return 0;
    return Math.max(...verses);
  }

  getVerseList(bookAbbrev, chapter) {
    this.init();
    const verses = this.chapters.get(`${bookAbbrev} ${chapter}`);
    if (!verses) return [];
    return Array.from(verses).sort((a, b) => a - b);
  }
}

// Singleton instance
export const vaultIndex = new VaultIndex();
export default vaultIndex;
