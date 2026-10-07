/**
 * Format verse ranges in heading parentheses using primary passage chapter:
 * e.g. "(20-21)" -> "([[Rom 7#v20|20]]–[[Rom 7#v21|21]])"
 * Note: No hidden verse anchors in headings per §6.5 & §7.2.
 * 
 * @param {string} headingText 
 * @param {{ abbrev: string, chapter: number } | null} primaryContext
 * @returns {string}
 */
export function linkifyHeadingRange(headingText, primaryContext) {
  if (!primaryContext || !primaryContext.abbrev || !primaryContext.chapter) {
    return headingText;
  }

  const { abbrev, chapter } = primaryContext;

  return headingText.replace(/\((\d+)\s*[-–]\s*(\d+)\)/g, (match, v1, v2) => {
    return `([[${abbrev} ${chapter}#v${v1}|${v1}]]–[[${abbrev} ${chapter}#v${v2}|${v2}]])`;
  }).replace(/\((\d+)\)/g, (match, v1) => {
    return `([[${abbrev} ${chapter}#v${v1}|${v1}]])`;
  });
}

/**
 * Transforms outline markers into nested Markdown bullets and promotes main points to headings.
 * 
 * @param {string} text - Reflowed text
 * @param {{ abbrev: string, chapter: number } | null} primaryContext - Primary sermon passage context
 * @returns {string} Cleaned markdown text
 */
export function cleanOutlineToMarkdown(text, primaryContext = null) {
  if (!text) return "";

  const lines = text.split("\n");
  const result = [];

  let lastWasLetter = false;
  let lastWasRoman = false;

  for (let rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      result.push("");
      continue;
    }

    // 1. Standalone section headings: Intro, Introduction, Background, Conclusion
    if (/^(intro|introduction|background|conclusion)$/i.test(line)) {
      result.push(`### ${line}`);
      lastWasLetter = false;
      lastWasRoman = false;
      continue;
    }

    // 2. Main point headings: e.g. "#1 The Enemy (20-21)"
    if (/^#\d+\s+.+\(\d+[-–]\d+\)$/i.test(line)) {
      const headingWithLinks = linkifyHeadingRange(line, primaryContext);
      result.push(`### ${headingWithLinks}`);
      lastWasLetter = false;
      lastWasRoman = false;
      continue;
    }

    // 3. Ordinal point headings: e.g. "Secondly, let’s look at The Battle (22-23)"
    if (/^(secondly|second|thirdly|third|fourthly|finally|next),?\s+.+\(\d+[-–]\d+\)$/i.test(line)) {
      const headingWithLinks = linkifyHeadingRange(line, primaryContext);
      result.push(`### ${headingWithLinks}`);
      lastWasLetter = false;
      lastWasRoman = false;
      continue;
    }

    // Preserve existing Markdown headings or callout lines
    if (line.startsWith("#") || line.startsWith(">")) {
      result.push(line);
      continue;
    }

    // 4. Level 1: A. B. C. ...
    const l1Match = line.match(/^([A-Z])\.\s+(.*)/);
    if (l1Match) {
      result.push(`- ${l1Match[2]}`);
      lastWasLetter = false;
      lastWasRoman = false;
      continue;
    }

    // 5. Level 2: 1. 2. 3. ...
    const l2Match = line.match(/^(\d+)\.\s+(.*)/);
    if (l2Match) {
      result.push(`  - ${l2Match[2]}`);
      lastWasLetter = false;
      lastWasRoman = false;
      continue;
    }

    // 6. Level 5: (a), (b), (1) ...
    const l5Match = line.match(/^\(([a-z0-9]+)\)\s+(.*)/);
    if (l5Match) {
      result.push(`        - ${l5Match[2]}`);
      lastWasLetter = false;
      lastWasRoman = false;
      continue;
    }

    // 7. Level 3 or 4: a. b. c. or roman numerals i. ii. iii. ...
    const lowerMatch = line.match(/^([a-z]+)\.\s+(.*)/);
    if (lowerMatch) {
      const marker = lowerMatch[1];
      const rest = lowerMatch[2];

      const isPotentialRoman = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/.test(marker);
      let isRoman = false;

      // Roman only if previous marker was a level-3 letter or a roman
      if (isPotentialRoman && (lastWasLetter || lastWasRoman)) {
        isRoman = true;
      }

      if (isRoman) {
        result.push(`      - ${rest}`);
        lastWasRoman = true;
        lastWasLetter = false;
      } else {
        result.push(`    - ${rest}`);
        lastWasLetter = true;
        lastWasRoman = false;
      }
      continue;
    }

    // 8. Plain unmarked paragraphs
    result.push(line);
  }

  return result.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
