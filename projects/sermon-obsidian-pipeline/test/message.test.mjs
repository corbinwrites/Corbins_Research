import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseWhatsAppMessage } from "../src/meta/message.mjs";

test("parses fixture WhatsApp message correctly", () => {
  const fixtureText = fs.readFileSync("test/fixtures/romans-7-20-25.message.txt", "utf-8");
  const result = parseWhatsAppMessage(fixtureText);

  assert.ok(result);
  assert.equal(result.title, "The Monster and the Master");
  assert.equal(result.date, "2026-09-27");
  assert.equal(result.passage, "Romans 7:20–25");
  assert.equal(result.teacher, "Chris Gee");
  assert.equal(result.questions.length, 3);
  assert.ok(result.questions[0].startsWith("Consider Paul’s words in verse 21"));
  assert.ok(result.questions[1].startsWith("When it comes to fighting"));
  assert.ok(result.questions[2].startsWith("As you look to Romans 7:24"));
});

test("triggers warning on truncated message ending with ellipsis", () => {
  const truncated = `The Monster and the Master
27 September 2026
Romans 7:20-25
Chris Gee
#1 Consider Paul's words in verse 21…`;

  const result = parseWhatsAppMessage(truncated);
  assert.ok(result.warnings.some((w) => w.includes("possibly truncated")));
});

test("triggers warning on message ending mid-sentence without punctuation", () => {
  const incomplete = `The Monster and the Master
27 September 2026
Romans 7:20-25
Chris Gee
#1 Consider Paul's words in verse 21, that our sin is our worst and lifelong`;

  const result = parseWhatsAppMessage(incomplete);
  assert.ok(result.warnings.some((w) => w.includes("truncated mid-sentence")));
});

test("triggers warning if date is not a Sunday", () => {
  // Sept 28, 2026 was a Monday
  const mondayMsg = `The Monster and the Master
28 September 2026
Romans 7:20-25
Chris Gee
#1 Question here.`;

  const result = parseWhatsAppMessage(mondayMsg);
  assert.ok(result.warnings.some((w) => w.includes("not a Sunday")));
});
