import test from "node:test";
import assert from "node:assert/strict";
import { linkify } from "../src/bible/linkify.mjs";

const context = { abbrev: "Rom", chapter: 7 };

test("links all §2.4 misses", () => {
  const report = { ok: 0, unresolved: [], bareRefs: 0 };

  // Chapter only
  const text1 = linkify("Turn to Rom. 7 and also Romans 6.", { primaryContext: context, report });
  assert.ok(text1.includes("[[Rom 7|Rom. 7]]"));
  assert.ok(text1.includes("[[Rom 6|Romans 6]]"));

  // Bare verses with primary context
  const text2 = linkify("Consider v. 21 and also verses 14-19 and verses 24-25.", {
    primaryContext: context,
    report,
  });
  assert.ok(text2.includes("[[Rom 7#v21|v. 21]]"));
  assert.ok(text2.includes("[[Rom 7#v14|verses 14-19]]"));
  assert.ok(text2.includes("[[Rom 7#v14|]][[Rom 7#v15|]][[Rom 7#v16|]][[Rom 7#v17|]][[Rom 7#v18|]][[Rom 7#v19|]]"));
  assert.ok(text2.includes("[[Rom 7#v24|verses 24-25]]"));
  assert.ok(text2.includes("[[Rom 7#v24|]][[Rom 7#v25|]]"));
});

test("leaves §7.5 non-Bible strings untouched", () => {
  const forbidden = [
    "19 years",
    "1819",
    "Marketing 9:30",
    "at 10:30",
    "144 planes",
    "Sicily",
    "the score was 6:5",
  ];

  for (const str of forbidden) {
    const report = { ok: 0, unresolved: [], bareRefs: 0 };
    const out = linkify(str, { primaryContext: context, report });
    assert.equal(out, str, `Expected "${str}" to remain untouched, got "${out}"`);
    assert.equal(report.ok, 0);
  }
});

test("is completely idempotent", () => {
  const input = "Turn to Rom. 7:14–19 and consider v. 21. Also check Philippians 3:20–21 and Romans 6.";
  const report1 = { ok: 0, unresolved: [], bareRefs: 0 };
  const firstPass = linkify(input, { primaryContext: context, report: report1 });

  const report2 = { ok: 0, unresolved: [], bareRefs: 0 };
  const secondPass = linkify(firstPass, { primaryContext: context, report: report2 });

  assert.equal(secondPass, firstPass);
});

test("generates all anchors for ranges longer than 25 verses without cap", () => {
  const input = "Read Genesis 1:1–31 in full.";
  const report = { ok: 0, unresolved: [], bareRefs: 0 };
  const out = linkify(input, { primaryContext: context, report });

  assert.ok(out.includes("[[Gen 1#v1|Genesis 1:1–31]]"));
  // Gen 1 has 31 verses; check that anchors up to v31 are present
  assert.ok(out.includes("[[Gen 1#v26|]]"));
  assert.ok(out.includes("[[Gen 1#v31|]]"));
  const count = (out.match(/\[\[Gen 1#v\d+\|\]\]/g) || []).length;
  assert.equal(count, 31);
});

test("invalid verse stays plain text and logs in unresolved", () => {
  const input = "Look at Romans 7:99 for guidance.";
  const report = { ok: 0, unresolved: [], bareRefs: 0 };
  const out = linkify(input, { primaryContext: context, report });

  assert.equal(out, input);
  assert.equal(report.unresolved.length, 1);
  assert.ok(report.unresolved[0].includes("Romans 7:99"));
});
