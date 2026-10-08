import books from "../bible/books.json" with { type: "json" };

function resolveBook(raw) {
  if (!raw) return null;
  const clean = raw.toLowerCase().replace(/\./g, "").trim().replace(/\s+/g, " ");
  for (const b of books) {
    if (b.name.toLowerCase() === clean) return b;
    for (const a of b.aliases) {
      if (a.toLowerCase().replace(/\./g, "").trim() === clean) return b;
    }
  }
  return null;
}

/**
 * Parse sermon filename into structured passage and metadata components.
 * Preserves the robust filename parsing logic from import-local-pdfs.mjs.
 * 
 * @param {string} filename 
 * @returns {object}
 */
export function parseFilename(filename) {
  const base = filename.replace(/\.(pdf|docx?|pages_.*)$/i, "").trim();

  const partMatch = base.match(/Part\s*(\d+)/i);
  const partSuffix = partMatch ? ` (Part ${partMatch[1]})` : "";

  let occasion = "";
  let embeddedPassage = null;
  const parenMatches = [...base.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]);

  for (const p of parenMatches) {
    if (/city light/gi.test(p)) {
      const occ = p.replace(/city light/gi, "").replace(/^[\s,]+|[\s,]+$/g, "").trim();
      if (occ) occasion = occ;
    } else if (/\d+\s+thess|romans|exodus|cor|john|matt|luke|peter|rev|thess/i.test(p)) {
      embeddedPassage = p;
    }
  }

  let withoutParen = base
    .replace(/\s*\(\d+\)$/, "")
    .replace(/\s*\([^)]*City Light[^)]*\)\s*$/gi, "")
    .replace(/,\s*Part\s*\d+/gi, "")
    .trim();

  const datePrefixMatch = withoutParen.match(/^(\d{4}-\d{2}-\d{2})[_\s]+(.+)/);
  const datePrefix = datePrefixMatch ? datePrefixMatch[1] : null;
  let coreText = datePrefixMatch ? datePrefixMatch[2] : (embeddedPassage || withoutParen);

  let cleanCore = coreText
    .replace(/^Exodus Two/i, "Exodus 2")
    .replace(/^Exodus Sermon/i, "Exodus")
    .replace(/\s*Preaching Notes.*/i, "")
    .replace(/\s*\(Manuscript\)/i, "")
    .replace(/\s+-\s+[A-Za-z_].*$/, "")
    .replace(/introduction/i, "")
    .trim();

  // 1 John 2-15-17 Message
  const dashVerse = cleanCore.match(/^(.+?)\s+(\d+)[-](\d+)[-](\d+)(?:\s+Message)?$/i);
  if (dashVerse) {
    const book = resolveBook(dashVerse[1].trim());
    return {
      bookRaw: dashVerse[1].trim(),
      book,
      chapter: parseInt(dashVerse[2], 10),
      verseStart: parseInt(dashVerse[3], 10),
      verseEnd: parseInt(dashVerse[4], 10),
      occasion,
      datePrefix,
      passageRaw: base,
      partSuffix,
    };
  }

  // Cross chapter: 1 Thessalonians 2_17-3_8 or Revelation 21_19-22_5
  const crossPattern = /^(.+?)\s+(\d+)[_:](\d+)\s*[-–]\s*(\d+)[_:](\d+)$/;
  const crossMatch = cleanCore.match(crossPattern);
  if (crossMatch) {
    const book = resolveBook(crossMatch[1].trim());
    return {
      bookRaw: crossMatch[1].trim(),
      book,
      chapter: parseInt(crossMatch[2], 10),
      verseStart: parseInt(crossMatch[3], 10),
      chapterEnd: parseInt(crossMatch[4], 10),
      verseEnd: parseInt(crossMatch[5], 10),
      occasion,
      datePrefix,
      passageRaw: base,
      isCross: true,
      partSuffix,
    };
  }

  // Semi-colon verse pattern: 2 Thessalonians 1_1-4; 11-12
  const semiPattern = /^(.+?)\s+(\d+)[_:](\d+)(?:[-–](\d+))?;\s*(\d+)(?:[-–](\d+))?$/;
  const semiMatch = cleanCore.match(semiPattern);
  if (semiMatch) {
    const book = resolveBook(semiMatch[1].trim());
    return {
      bookRaw: semiMatch[1].trim(),
      book,
      chapter: parseInt(semiMatch[2], 10),
      verseStart: parseInt(semiMatch[3], 10),
      verseEnd: parseInt(semiMatch[4] || semiMatch[3], 10),
      extraVerseStart: parseInt(semiMatch[5], 10),
      extraVerseEnd: parseInt(semiMatch[6] || semiMatch[5], 10),
      occasion,
      datePrefix,
      passageRaw: base,
      isSemi: true,
      partSuffix,
    };
  }

  // Space-delimited chapter and verse: e.g. Genesis 4 1-16 or John 9 1-41
  const spaceVersePattern = /^(.+?)\s+(\d+)\s+(\d+)\s*[-–]\s*(\d+)$/;
  const spaceMatch = cleanCore.match(spaceVersePattern);
  if (spaceMatch) {
    const book = resolveBook(spaceMatch[1].trim());
    return {
      bookRaw: spaceMatch[1].trim(),
      book,
      chapter: parseInt(spaceMatch[2], 10),
      verseStart: parseInt(spaceMatch[3], 10),
      verseEnd: parseInt(spaceMatch[4], 10),
      occasion,
      datePrefix,
      passageRaw: base,
      partSuffix,
    };
  }

  // Chapter range: Exodus 7-10 or Exodus 16-40
  const chRangePattern = /^(.+?)\s+(\d+)\s*[-–]\s*(\d+)$/;
  const chMatch = cleanCore.match(chRangePattern);
  const numberedBookPrefixes = [
    "1 cor", "2 cor", "1 thess", "2 thess", "1 tim", "2 tim",
    "1 pet", "2 pet", "1 john", "2 john", "3 john",
    "1 sam", "2 sam", "1 kgs", "2 kgs", "1 chr", "2 chr",
  ];
  if (chMatch && !numberedBookPrefixes.includes(chMatch[1].toLowerCase().trim())) {
    const book = resolveBook(chMatch[1].trim());
    return {
      bookRaw: chMatch[1].trim(),
      book,
      chapter: parseInt(chMatch[2], 10),
      chapterEnd: parseInt(chMatch[3], 10),
      verseStart: null,
      verseEnd: null,
      occasion,
      datePrefix,
      passageRaw: base,
      partSuffix,
    };
  }

  // Standard: Book Ch_V1-V2 or Book Ch:V1-V2 or Book Ch V1-V2
  const standardPattern = /^(.+?)\s+(\d+)(?:[_:](\d+)(?:[-–](\d+))?)?$/;
  const stdMatch = cleanCore.match(standardPattern);
  if (stdMatch) {
    const book = resolveBook(stdMatch[1].trim());
    return {
      bookRaw: stdMatch[1].trim(),
      book,
      chapter: parseInt(stdMatch[2], 10),
      chapterEnd: null,
      verseStart: stdMatch[3] ? parseInt(stdMatch[3], 10) : null,
      verseEnd: stdMatch[4] ? parseInt(stdMatch[4], 10) : null,
      occasion,
      datePrefix,
      passageRaw: base,
      partSuffix,
    };
  }

  return {
    bookRaw: cleanCore,
    book: resolveBook(cleanCore),
    chapter: null,
    chapterEnd: null,
    verseStart: null,
    verseEnd: null,
    occasion,
    datePrefix,
    passageRaw: base,
    partSuffix,
  };
}

export function buildPassageLabel(parsedInfo, book) {
  const resolvedBook = book || parsedInfo.book;
  const bookName = resolvedBook ? resolvedBook.folder : parsedInfo.bookRaw;
  let label = bookName;

  if (parsedInfo.isCross) {
    label = `${bookName} ${parsedInfo.chapter}:${parsedInfo.verseStart}–${parsedInfo.chapterEnd}:${parsedInfo.verseEnd}`;
  } else if (parsedInfo.isSemi) {
    label = `${bookName} ${parsedInfo.chapter}:${parsedInfo.verseStart}–${parsedInfo.verseEnd}; ${parsedInfo.extraVerseStart}–${parsedInfo.extraVerseEnd}`;
  } else if (parsedInfo.chapterEnd) {
    label = `${bookName} ${parsedInfo.chapter}–${parsedInfo.chapterEnd}`;
  } else if (parsedInfo.chapter) {
    label = `${bookName} ${parsedInfo.chapter}`;
    if (parsedInfo.verseStart) {
      label += `:${parsedInfo.verseStart}`;
      if (parsedInfo.verseEnd && parsedInfo.verseEnd !== parsedInfo.verseStart) {
        label += `–${parsedInfo.verseEnd}`;
      }
    }
  }

  if (parsedInfo.partSuffix) label += parsedInfo.partSuffix;
  return label;
}
