import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { checkSite } from "../scripts/check-site.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skipped = new Set([".git", ".playwright-cli", "node_modules", "output"]);

function fixture() {
  const target = mkdtempSync(join(tmpdir(), "proof-portfolio-"));
  cpSync(root, target, {
    recursive: true,
    filter: (source) => !skipped.has(source.split(/[\\/]/).at(-1)),
  });
  return target;
}

function replace(path, before, after) {
  const content = readFileSync(path, "utf8");
  assert.ok(content.includes(before), `fixture text was not found: ${before}`);
  writeFileSync(path, content.replace(before, after), "utf8");
}

test("accepts the reviewed source portfolio", () => {
  assert.deepEqual(checkSite(root), []);
});

test("rejects public GitHub profile links and unresolved deployment tokens", (context) => {
  const target = fixture();
  context.after(() => rmSync(target, { recursive: true, force: true }));
  replace(
    join(target, "index.html"),
    "</footer>",
    '<a href="https://github.com/example">GitHub</a><span>SECOND_USERNAME</span></footer>',
  );

  const failures = checkSite(target).join("\n");
  assert.match(failures, /public GitHub links are not allowed/);
  assert.match(failures, /unresolved username token/);
});

test("rejects missing proof labels, invented claims, and CNAME", (context) => {
  const target = fixture();
  context.after(() => rmSync(target, { recursive: true, force: true }));
  writeFileSync(join(target, "CNAME"), "example.com\n", "utf8");
  replace(
    join(target, "csv-rescue.html"),
    "Concept demo · Runs in your browser",
    "Data cleanup tool",
  );
  replace(
    join(target, "case-study-dentsignal.html"),
    "Real interface. Synthetic demo data.",
    "Trusted by 200 clinics with $1M revenue.",
  );

  const failures = checkSite(target).join("\n");
  assert.match(failures, /CNAME must remain absent/);
  assert.match(failures, /missing truthful concept label/);
  assert.match(failures, /missing DentSignal truth caption/);
  assert.match(failures, /prohibited commercial proof claim/);
});

test("rejects duplicate IDs and broken local assets", (context) => {
  const target = fixture();
  context.after(() => rmSync(target, { recursive: true, force: true }));
  replace(join(target, "webhook-lab.html"), "id=\"main\"", 'id="main" id="main"');
  replace(
    join(target, "index.html"),
    "assets/proof/csv-rescue-desktop.png",
    "assets/proof/missing.png",
  );

  const failures = checkSite(target).join("\n");
  assert.match(failures, /duplicate IDs main/);
  assert.match(failures, /broken local reference assets\/proof\/missing.png/);
});
