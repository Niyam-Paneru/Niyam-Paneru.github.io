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

test("publishes five sanitized DentSignal engineering case studies with exact evidence boundaries", () => {
  const cases = [
    {
      name: "case-study-deployment-drift.html",
      evidence: [
        ["https://github.com/Niyam-Paneru/dentsignal/pull/228", "5b2b197"],
        ["https://github.com/Niyam-Paneru/dentsignal/pull/231", "ba03dd4"],
        ["https://github.com/Niyam-Paneru/dentsignal/pull/232", "11ad47a"],
        ["https://github.com/Niyam-Paneru/dentsignal/pull/234", "9662eb1"],
      ],
      boundary:
        "DentSignal is not client work. This evidence does not establish continuous availability, present deployment state, or a guarantee against future drift.",
    },
    {
      name: "case-study-ci-gate-recovery.html",
      evidence: [["https://github.com/Niyam-Paneru/dentsignal/pull/90", "7252c74"]],
      boundary:
        "DentSignal is not client work. The merge does not establish present-day CI status, complete product security, or absence of later regressions.",
    },
    {
      name: "case-study-cloud-provider-config.html",
      evidence: [
        ["https://github.com/Niyam-Paneru/dentsignal/pull/222", "9191216"],
        ["https://github.com/Niyam-Paneru/dentsignal/pull/224", "73e4c93"],
      ],
      boundary:
        "DentSignal is not client work. This was not an Azure infrastructure migration and does not claim a real call or present provider behavior.",
    },
    {
      name: "case-study-async-response-ownership.html",
      evidence: [
        ["https://github.com/Niyam-Paneru/dentsignal/pull/223", "a4c498e"],
        ["https://github.com/Niyam-Paneru/dentsignal/pull/225", "ab250dc"],
        ["https://github.com/Niyam-Paneru/dentsignal/pull/226", "bd5c8e4"],
      ],
      boundary:
        "DentSignal is not client work. This evidence does not establish perfect latency, live-clinic outcomes, or correctness outside the cited paths.",
    },
    {
      name: "case-study-webhook-token-hardening.html",
      evidence: [
        ["https://github.com/Niyam-Paneru/dentsignal/pull/122", "e62e439"],
        ["https://github.com/Niyam-Paneru/dentsignal/pull/210", "e42c611"],
      ],
      boundary:
        "DentSignal is not client work. This evidence is not a compliance certification, external cryptographic review, or guarantee against every replay or authorization bug.",
    },
  ];
  const home = readFileSync(join(root, "index.html"), "utf8");

  for (const { name, evidence, boundary } of cases) {
    const content = readFileSync(join(root, name), "utf8");
    assert.match(content, /DentSignal engineering case study/);
    assert.ok(content.includes("Historical PR-reported validation"), `${name} lacks the exact validation label`);
    assert.ok(content.includes("DentSignal is not client work"), `${name} lacks the disclosure prefix`);
    assert.ok(content.includes(boundary), `${name} lacks its complete source claim boundary`);
    for (const [url, commit] of evidence) {
      assert.ok(content.includes(url), `${name} lacks ${url}`);
      assert.ok(content.includes(commit), `${name} lacks ${commit}`);
    }
    assert.match(content, /This is engineering proof, not customer proof\./);
    assert.match(content, /Rollback/);
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
