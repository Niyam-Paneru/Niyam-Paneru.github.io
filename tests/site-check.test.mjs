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

test("publishes five plain-language repair stories without private repository links", () => {
  const cases = [
    {
      name: "case-study-deployment-drift.html",
      boundary:
        "DentSignal is not client work. This evidence does not establish continuous availability, present deployment state, or a guarantee against future drift.",
    },
    {
      name: "case-study-ci-gate-recovery.html",
      boundary:
        "DentSignal is not client work. The merge does not establish present-day CI status, complete product security, or absence of later regressions.",
    },
    {
      name: "case-study-cloud-provider-config.html",
      boundary:
        "DentSignal is not client work. This was not an Azure infrastructure migration and does not claim a real call or present provider behavior.",
    },
    {
      name: "case-study-async-response-ownership.html",
      boundary:
        "DentSignal is not client work. This evidence does not establish perfect latency, live-clinic outcomes, or correctness outside the cited paths.",
    },
    {
      name: "case-study-webhook-token-hardening.html",
      boundary:
        "DentSignal is not client work. This evidence is not a compliance certification, external cryptographic review, or guarantee against every replay or authorization bug.",
    },
  ];
  const home = readFileSync(join(root, "index.html"), "utf8");

  assert.match(home, /class="repair-collection"/);
  assert.equal(
    [...home.matchAll(/class="repair-row"/g)].length,
    5,
    "index.html must group exactly five engineering repairs",
  );
  assert.doesNotMatch(home, /engineering-proof-card/);
  assert.doesNotMatch(home, /assets\/proof\/dentsignal-dashboard/);
  assert.equal([...home.matchAll(/class="proof-band(?:\s|")/g)].length, 3);

  for (const { name, boundary } of cases) {
    const content = readFileSync(join(root, name), "utf8");
    assert.match(content, /DentSignal engineering case study/);
    assert.ok(content.includes("Historical PR-reported validation"), `${name} lacks the exact validation label`);
    assert.ok(content.includes("DentSignal is not client work"), `${name} lacks the disclosure prefix`);
    assert.ok(content.includes(boundary), `${name} lacks its complete source claim boundary`);
    assert.doesNotMatch(content, /github\.com/i);
    assert.doesNotMatch(content, /pull\/\d+/i);
    assert.doesNotMatch(content, /<code>[0-9a-f]{7}<\/code>/i);
    assert.match(content, /What broke/);
    assert.match(content, /What changed/);
    assert.match(content, /Why it matters/);
    assert.match(content, /Broken · simplified example/);
    assert.match(content, /Fixed · simplified example/);
    assert.match(content, /Illustration only — not copied from private source\./);
    assert.match(content, /How it was checked/);
    assert.match(content, /What this does not prove/);
    assert.match(content, /This is engineering proof, not customer proof\./);
    assert.ok(home.includes(`href="${name}"`), `index.html does not link ${name}`);
  }
});

test("documents the actual repository owner and public URL", () => {
  for (const name of ["README.md", "MIGRATION.md"]) {
    const content = readFileSync(join(root, name), "utf8");
    assert.ok(content.includes("Niyam-Paneru/Niyam-Paneru.github.io"), `${name} lacks the repository`);
    assert.ok(content.includes("https://niyam-paneru.github.io/"), `${name} lacks the public URL`);
    assert.ok(!content.includes("NiyamPaneru"), `${name} contains the old owner`);
    assert.ok(!content.includes("https://niyampaneru.github.io/"), `${name} contains the old public URL`);
  }
  const readme = readFileSync(join(root, "README.md"), "utf8");
  assert.ok(readme.includes("30 unit/static tests"), "README.md contains a stale test count");
});

test("migration hygiene does not reject the actual public URL", () => {
  const content = readFileSync(join(root, "MIGRATION.md"), "utf8");
  const usernameToken = ["SECOND", "USERNAME"].join("_");
  const helperSafeToken = usernameToken.replace("_", "[_]");
  assert.ok(
    !content.includes(`rg -n "${usernameToken}|https://niyam-paneru.github.io"`),
    "MIGRATION.md treats the actual public URL as stale",
  );
  assert.ok(!content.includes(usernameToken), "MIGRATION.md exposes its username-token check to the helper");
  assert.ok(
    content.includes(`rg -n "${helperSafeToken}" .`),
    "MIGRATION.md lacks its helper-safe username-token check",
  );
});

test("rejects every public GitHub link and unresolved deployment tokens", (context) => {
  const target = fixture();
  const evidenceTarget = fixture();
  context.after(() => {
    rmSync(target, { recursive: true, force: true });
    rmSync(evidenceTarget, { recursive: true, force: true });
  });
  const privatePullUrl = [
    "https://github.com/Niyam-Paneru/dentsignal/",
    "pull/",
    "228",
  ].join("");
  replace(
    join(target, "index.html"),
    "</footer>",
    `<a href="${privatePullUrl}">Private evidence</a><span>SECOND_USERNAME</span></footer>`,
  );

  const failures = checkSite(target).join("\n");
  assert.match(failures, /public GitHub links are not allowed/);
  assert.match(failures, /unresolved username token/);

  const privateCommit = ["5b2", "b197"].join("");
  replace(
    join(evidenceTarget, "index.html"),
    "</footer>",
    `<code>${privateCommit}</code></footer>`,
  );
  assert.match(
    checkSite(evidenceTarget).join("\n"),
    /public repository evidence identifiers are not allowed/,
  );
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
