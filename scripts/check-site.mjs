import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([".git", "node_modules"]);

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    if (ignoredDirectories.has(entry)) return [];
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(root);
const htmlFiles = files.filter((file) => extname(file) === ".html");
const failures = [];

if (files.includes(join(root, "CNAME"))) failures.push("CNAME must remain absent from the service-site repository");

for (const requiredFile of [
  "MIGRATION.md",
  "scripts/replace-base-url.mjs",
  "sample-web-app-launch-blocker.html",
  "sample-fastapi-api-repair.html",
  "samples/web-app-launch-blocker-repair-report.md",
  "samples/fastapi-api-debugging-repair-report.md",
]) {
  if (!files.includes(join(root, requiredFile))) failures.push(`missing required file ${requiredFile}`);
}

const localTarget = (source, href) => {
  const withoutFragment = href.split("#")[0].split("?")[0];
  if (!withoutFragment) return source;
  return withoutFragment.startsWith("/")
    ? join(root, withoutFragment.slice(1) || "index.html")
    : normalize(join(dirname(source), withoutFragment));
};

for (const file of htmlFiles) {
  const rel = relative(root, file);
  const content = readFileSync(file, "utf8");

  for (const required of ["<title>", 'name="description"', "<main", "</html>"]) {
    if (!content.includes(required)) failures.push(`${rel}: missing ${required}`);
  }

  if (rel !== "404.html") {
    const canonical = content.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
    const socialUrl = content.match(/<meta property="og:url" content="([^"]+)">/)?.[1];
    if (!canonical) failures.push(`${rel}: missing canonical URL`);
    if (!socialUrl) failures.push(`${rel}: missing og:url`);
    if (canonical && socialUrl && canonical !== socialUrl) failures.push(`${rel}: canonical and og:url differ`);
  }

  if (rel === "404.html") {
    for (const requiredRootUrl of ['/assets/styles.css', '/assets/script.js', '/assets/favicon.svg', 'href="/"']) {
      if (!content.includes(requiredRootUrl)) failures.push(`${rel}: missing rooted URL ${requiredRootUrl}`);
    }
  }

  const ids = [...content.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length) failures.push(`${rel}: duplicate IDs ${[...new Set(duplicateIds)].join(", ")}`);

  for (const match of content.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const href = match[1];
    if (/^(?:https?:|mailto:|tel:|data:|#)/.test(href)) continue;
    const target = localTarget(file, href);
    if (!files.includes(target)) failures.push(`${rel}: broken local reference ${href}`);
    const fragment = href.includes("#") ? decodeURIComponent(href.split("#")[1]) : "";
    if (fragment && files.includes(target)) {
      const targetContent = readFileSync(target, "utf8");
      const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!new RegExp(`\\sid=["']${escaped}["']`).test(targetContent)) {
        failures.push(`${rel}: missing cross-page fragment ${href}`);
      }
    }
  }

  for (const match of content.matchAll(/href="#([^"]+)"/g)) {
    if (!ids.includes(match[1])) failures.push(`${rel}: missing fragment #${match[1]}`);
  }

  for (const match of content.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    if (!/rel="[^"]*noopener[^"]*"/.test(match[0])) failures.push(`${rel}: target=_blank without noopener`);
  }

  const primaryNavigation = content.match(/<nav class="site-nav"[\s\S]*?<\/nav>/)?.[0] ?? "";
  if (/voice-agent-qa\.html|>Voice QA</i.test(primaryNavigation)) {
    failures.push(`${rel}: Voice QA must remain outside primary navigation`);
  }

  if (rel.startsWith("sample-") && (content.match(/Synthetic demonstration/gi) ?? []).length < 3) {
    failures.push(`${rel}: synthetic label is not repeated enough`);
  }
}

const home = readFileSync(join(root, "index.html"), "utf8");
const requiredPrimaryOffers = [
  "Quick Technical Fix",
  "Web App Launch-Blocker Sprint",
  "API &amp; Backend Repair Sprint",
  "Workflow Reliability Sprint",
  "Small Build Sprint",
];
for (const offer of requiredPrimaryOffers) {
  if (!home.includes(offer)) failures.push(`index.html: missing primary offer ${offer}`);
}

const specialistIndex = home.indexOf("Secondary specialist service");
const lastPrimaryIndex = Math.max(...requiredPrimaryOffers.map((offer) => home.indexOf(offer)));
if (specialistIndex === -1 || specialistIndex < lastPrimaryIndex) {
  failures.push("index.html: specialist Voice QA must follow all primary service lanes");
}

for (const proofLink of [
  "sample-web-app-launch-blocker.html",
  "sample-fastapi-api-repair.html",
  "sample-workflow-reliability.html",
  "case-study-dentsignal.html",
]) {
  if (!home.includes(`href="${proofLink}"`)) failures.push(`index.html: missing proof link ${proofLink}`);
}

if (!/supporting evidence/i.test(home)) {
  failures.push("index.html: DentSignal must be described as supporting evidence");
}

const textExtensions = new Set([".css", ".html", ".js", ".json", ".jsonc", ".md", ".mjs", ".svg", ".txt", ".yaml", ".yml"]);
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

for (const file of files.filter((candidate) => textExtensions.has(extname(candidate)))) {
  const rel = relative(root, file);
  const content = readFileSync(file, "utf8");
  if (possibleCredential.test(content)) failures.push(`${rel}: possible credential material`);
}

if (!htmlFiles.length) failures.push("No HTML files found");

if (failures.length) {
  console.error(`Site checks failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Site checks passed: ${htmlFiles.length} HTML pages and ${files.length} files inspected.`);
