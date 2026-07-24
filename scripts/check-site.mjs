import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([".git", ".playwright-cli", "node_modules", "output"]);
const requiredFiles = [
  "index.html",
  "csv-rescue.html",
  "webhook-lab.html",
  "case-study-dentsignal.html",
  "case-study-deployment-drift.html",
  "case-study-ci-gate-recovery.html",
  "case-study-cloud-provider-config.html",
  "case-study-async-response-ownership.html",
  "case-study-webhook-token-hardening.html",
  "404.html",
  "MIGRATION.md",
  "scripts/replace-base-url.mjs",
  "assets/csv-rescue.js",
  "assets/webhook-lab.js",
  "assets/proof/csv-rescue-desktop.png",
  "assets/proof/webhook-lab-desktop.png",
  "assets/proof/dentsignal-dashboard-desktop.png",
];
const obsoletePages = [
  "voice-agent-qa.html",
  "sample-fastapi-api-repair.html",
  "sample-voice-agent-qa.html",
  "sample-web-app-launch-blocker.html",
  "sample-workflow-reliability.html",
];
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsonc",
  ".md",
  ".mjs",
  ".svg",
  ".txt",
  ".yaml",
  ".yml",
]);

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    if (ignoredDirectories.has(entry)) return [];
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function localTarget(root, source, href) {
  const withoutFragment = href.split("#")[0].split("?")[0];
  if (!withoutFragment) return source;
  return withoutFragment.startsWith("/")
    ? join(root, withoutFragment.slice(1) || "index.html")
    : normalize(join(dirname(source), withoutFragment));
}

function hasId(content, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\sid=["']${escaped}["']`).test(content);
}

function relativeSlash(root, path) {
  return relative(root, path).replaceAll("\\", "/");
}

export function checkSite(root = scriptRoot) {
  const files = walk(root);
  const fileSet = new Set(files);
  const htmlFiles = files.filter((file) => extname(file).toLowerCase() === ".html");
  const failures = [];
  const fail = (message) => failures.push(message);

  if (fileSet.has(join(root, "CNAME"))) fail("CNAME must remain absent from the service-site repository");
  for (const required of requiredFiles) {
    if (!fileSet.has(join(root, required))) fail(`missing required file ${required}`);
  }
  for (const obsolete of obsoletePages) {
    if (fileSet.has(join(root, obsolete))) fail(`obsolete public page must be removed: ${obsolete}`);
  }

  for (const file of htmlFiles) {
    const rel = relativeSlash(root, file);
    const content = readFileSync(file, "utf8");

    for (const required of ["<title>", 'name="description"', "<main", "</html>"]) {
      if (!content.includes(required)) fail(`${rel}: missing ${required}`);
    }

    if (rel !== "404.html") {
      const canonical = content.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
      const socialUrl = content.match(/<meta property="og:url" content="([^"]+)">/)?.[1];
      if (!canonical) fail(`${rel}: missing canonical URL`);
      if (!socialUrl) fail(`${rel}: missing og:url`);
      if (canonical && socialUrl && canonical !== socialUrl) {
        fail(`${rel}: canonical and og:url differ`);
      }
    }

    if (rel === "404.html") {
      for (const rooted of ["/assets/styles.css", "/assets/script.js", "/assets/favicon.svg", 'href="/"']) {
        if (!content.includes(rooted)) fail(`${rel}: missing rooted URL ${rooted}`);
      }
    }

    const ids = [...content.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length) fail(`${rel}: duplicate IDs ${[...new Set(duplicates)].join(", ")}`);

    for (const match of content.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const href = match[1];
      if (/^(?:https?:|mailto:|tel:|data:|blob:|#)/.test(href)) continue;
      const target = localTarget(root, file, href);
      if (!fileSet.has(target)) fail(`${rel}: broken local reference ${href}`);

      const fragment = href.includes("#") ? decodeURIComponent(href.split("#")[1]) : "";
      if (fragment && fileSet.has(target)) {
        const targetContent = readFileSync(target, "utf8");
        if (!hasId(targetContent, fragment)) fail(`${rel}: missing cross-page fragment ${href}`);
      }
    }

    for (const match of content.matchAll(/href="#([^"]+)"/g)) {
      if (!ids.includes(match[1])) fail(`${rel}: missing fragment #${match[1]}`);
    }

    for (const match of content.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
      if (!/rel="[^"]*noopener[^"]*"/.test(match[0])) {
        fail(`${rel}: target=_blank without noopener`);
      }
    }

    const githubLinks = [
      ...content.matchAll(/href="(https?:\/\/(?:www\.)?github\.com\/[^"]+)"/gi),
    ].map((match) => match[1]);
    if (githubLinks.length) {
      fail(`${rel}: public GitHub links are not allowed`);
    }
    if (/(?:\bpull\/\d+|\bPR\s*#?\d+\b|<code>[0-9a-f]{7,40}<\/code>)/i.test(content)) {
      fail(`${rel}: public repository evidence identifiers are not allowed`);
    }
    if (content.includes("SECOND_USERNAME")) fail(`${rel}: unresolved username token`);
    if (/trusted by|\$\s?\d+(?:\.\d+)?[kmb]?\s+(?:arr|mrr|revenue)|\b\d+\+?\s+(?:paying )?(?:customers|clinics)\b/i.test(content)) {
      fail(`${rel}: prohibited commercial proof claim`);
    }
    if (/<script[^>]+src="https?:\/\//i.test(content)) {
      fail(`${rel}: external JavaScript dependency is not allowed`);
    }
  }

  const page = (name) =>
    fileSet.has(join(root, name)) ? readFileSync(join(root, name), "utf8") : "";
  const home = page("index.html");
  const csv = page("csv-rescue.html");
  const webhook = page("webhook-lab.html");
  const dentsignal = page("case-study-dentsignal.html");

  for (const required of [
    "I make broken software shippable.",
    "Concept demo · Runs in your browser",
    "Concept demo · Deterministic simulation",
    "Real interface. Synthetic demo data.",
    "niyampaneru79@gmail.com",
  ]) {
    if (!home.includes(required)) fail(`index.html: missing required proof or contact text: ${required}`);
  }
  if (!csv.includes("Concept demo · Runs in your browser")) {
    fail("csv-rescue.html: missing truthful concept label");
  }
  if (!webhook.includes("Concept demo · Deterministic simulation")) {
    fail("webhook-lab.html: missing truthful concept label");
  }
  if (!dentsignal.includes("Real interface. Synthetic demo data.")) {
    fail("case-study-dentsignal.html: missing DentSignal truth caption");
  }

  const styles = page("assets/styles.css");
  if (/gradient\s*\(/i.test(styles)) fail("assets/styles.css: gradients are prohibited by the design brief");
  if (/\b(?:purple|magenta|neon)\b/i.test(styles)) {
    fail("assets/styles.css: prohibited AI-slope color keyword");
  }

  const possibleCredential = new RegExp(
    [
      "s[k]_live_",
      "(?:gh[pousr]|github_pat)_[A-Za-z0-9_]{20,}",
      "(?:AKIA|ASIA)[A-Z0-9]{16}",
      "-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
      "(?:api[_-]?key|client[_-]?secret|password|access[_-]?token)\\s*[:=]\\s*[\\\"'][^\\\"']{8,}[\\\"']",
    ].join("|"),
    "i",
  );

  for (const file of files.filter((candidate) => textExtensions.has(extname(candidate).toLowerCase()))) {
    const content = readFileSync(file, "utf8");
    if (possibleCredential.test(content)) fail(`${relativeSlash(root, file)}: possible credential material`);
  }

  if (!htmlFiles.length) fail("No HTML files found");
  return failures;
}

function main() {
  const failures = checkSite(scriptRoot);
  if (failures.length) {
    console.error(`Site checks failed (${failures.length}):`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  const files = walk(scriptRoot);
  const htmlCount = files.filter((file) => extname(file).toLowerCase() === ".html").length;
  console.log(`Site checks passed: ${htmlCount} HTML pages and ${files.length} files inspected.`);
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) main();
