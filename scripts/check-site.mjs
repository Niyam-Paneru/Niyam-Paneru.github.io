import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
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

const localTarget = (source, href) => {
  const withoutFragment = href.split("#")[0].split("?")[0];
  if (!withoutFragment) return source;
  return withoutFragment.startsWith("/")
    ? join(root, withoutFragment.slice(1))
    : normalize(join(dirname(source), withoutFragment));
};

for (const file of htmlFiles) {
  const rel = relative(root, file);
  const content = readFileSync(file, "utf8");

  for (const required of ["<title>", 'name="description"', "<main", "</html>"]) {
    if (!content.includes(required)) failures.push(`${rel}: missing ${required}`);
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

  if (rel.startsWith("sample-") && (content.match(/Synthetic demonstration/gi) ?? []).length < 3) {
    failures.push(`${rel}: synthetic label is not repeated enough`);
  }

  if (/sk_live_|api[_-]?key\s*=|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY/i.test(content)) {
    failures.push(`${rel}: possible credential material`);
  }
}

if (!htmlFiles.length) failures.push("No HTML files found");

if (failures.length) {
  console.error(`Site checks failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Site checks passed: ${htmlFiles.length} HTML pages and ${files.length} files inspected.`);
