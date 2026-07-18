import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_INPUT_BYTES,
  cleanCsv,
  parseCsv,
  serializeCsv,
} from "../assets/csv-rescue.js";

test("parses quoted commas, newlines, and escaped quotes", () => {
  const parsed = parseCsv(
    'name,note\n"Ada, A.","Line one\nLine two"\n"Quote ""inside""",ok',
  );

  assert.deepEqual(parsed.headers, ["name", "note"]);
  assert.deepEqual(parsed.rows[0].values, ["Ada, A.", "Line one\nLine two"]);
  assert.deepEqual(parsed.rows[1].values, ['Quote "inside"', "ok"]);
});

test("reports the source row for an unclosed quote", () => {
  assert.throws(
    () => parseCsv('name,email\n"Ada,ada@example.com'),
    /Unclosed quoted field starting on row 2/,
  );
});

test("reports inconsistent column counts", () => {
  assert.throws(
    () => parseCsv("name,email\nAda,ada@example.com,extra"),
    /Row 2 has 3 columns; expected 2/,
  );
});

test("requires a non-empty header row", () => {
  assert.throws(() => parseCsv("\nAda,ada@example.com"), /header row/i);
});

test("caps browser-local input at 512 KiB", () => {
  const oversized = `name\n${"a".repeat(MAX_INPUT_BYTES)}`;
  assert.throws(() => parseCsv(oversized), /512 KiB local-processing limit/);
});

test("normalizes only safe values and removes exact normalized duplicates", () => {
  const result = cleanCsv(
    "name,email,date\n Ada ,ADA@EXAMPLE.COM,2026-7-2\nAda,ada@example.com,2026-07-02",
    { requiredHeaders: ["name", "email"] },
  );

  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.rows[0], {
    name: "Ada",
    email: "ada@example.com",
    date: "2026-07-02",
  });
  assert.equal(result.metrics.rowsIn, 2);
  assert.equal(result.metrics.rowsOut, 1);
  assert.equal(result.metrics.duplicatesRemoved, 1);
  assert.ok(result.metrics.fixesApplied >= 3);
});

test("flags ambiguous dates instead of rewriting them", () => {
  const result = cleanCsv(
    "name,email,date\nAda,ada@example.com,07/08/2026",
    { requiredHeaders: ["name", "email"] },
  );

  assert.equal(result.rows[0].date, "07/08/2026");
  assert.ok(result.issues.some((issue) => issue.code === "ambiguous-date" && issue.row === 2));
});

test("flags malformed emails and blank required values", () => {
  const result = cleanCsv(
    "name,email,date\n,not-an-email,2026-07-02",
    { requiredHeaders: ["name", "email"] },
  );

  assert.ok(result.issues.some((issue) => issue.code === "blank-required" && issue.column === "name"));
  assert.ok(result.issues.some((issue) => issue.code === "malformed-email" && issue.column === "email"));
  assert.equal(result.metrics.warnings, 2);
});

test("rejects a missing required header", () => {
  assert.throws(
    () => cleanCsv("name,date\nAda,2026-07-02", { requiredHeaders: ["name", "email"] }),
    /Missing required header: email/,
  );
});

test("serializes commas, quotes, and newlines safely", () => {
  assert.equal(
    serializeCsv(["name", "note"], [{ name: 'Ada "A"', note: "one,two\nthree" }]),
    'name,note\n"Ada ""A""","one,two\nthree"',
  );
});
