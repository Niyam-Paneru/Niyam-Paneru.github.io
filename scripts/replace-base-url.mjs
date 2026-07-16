#!/usr/bin/env node

import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import process from "node:process";

const sourceBase = ["https://niyam-paneru", "github", "io"].join(".");
const usernamePlaceholder = ["SECOND", "USERNAME"].join("_");
const dormantTrigger = "on:\n  workflow_dispatch:\n  # SECOND_ACCOUNT_PUSH_TRIGGER";
const activeTrigger = "on:\n  push:\n    branches: [\"main\"]\n  workflow_dispatch:";
const username = process.argv[2];
const checkOnly = process.argv.includes("--check");
const allowedExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".svg",
  ".txt",
  ".yaml",
  ".yml",
]);
const skippedDirectories = new Set([".git", "node_modules"]);

function usage(message) {
  if (message) console.error(message);
  console.error(
    "Usage: node scripts/replace-base-url.mjs <real-github-username> [--check]",
  );
  process.exit(1);
}

if (!username) usage("A GitHub username is required.");
if (username === usernamePlaceholder) {
  usage("Replace the example placeholder with the real second-account username.");
}
if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) {
  usage("The username must use GitHub's letters, digits and single-hyphen format.");
}
if (username.includes("--")) {
  usage("GitHub usernames cannot contain consecutive hyphens.");
}

const targetBase = `https://${username.toLowerCase()}.github.io`;
const root = process.cwd();
const changed = [];
let replacementCount = 0;
let placeholderCount = 0;
let workflowActivation = false;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    if (!entry.isFile() || !allowedExtensions.has(extname(entry.name))) continue;

    const original = await readFile(path, "utf8");
    const matches = original.split(sourceBase).length - 1;
    const placeholders = original.split(usernamePlaceholder).length - 1;
    if (matches === 0 && placeholders === 0) continue;

    replacementCount += matches;
    placeholderCount += placeholders;
    changed.push({ file: relative(root, path), matches, placeholders });
    if (!checkOnly) {
      const updated = original
        .split(sourceBase).join(targetBase)
        .split(usernamePlaceholder).join(username);
      await writeFile(path, updated, "utf8");
    }
  }
}

await walk(root);

const workflowPath = join(root, ".github", "workflows", "pages.yml");
const workflow = await readFile(workflowPath, "utf8");
if (workflow.includes(dormantTrigger)) {
  workflowActivation = true;
  if (!checkOnly) {
    await writeFile(workflowPath, workflow.replace(dormantTrigger, activeTrigger), "utf8");
  }
} else if (!workflow.includes(activeTrigger)) {
  throw new Error("Pages workflow has neither the reviewed dormant marker nor the active main-branch trigger.");
}

const mode = checkOnly ? "would update" : "updated";
const workflowMode = workflowActivation
  ? checkOnly
    ? "would activate"
    : "activated"
  : "already active";
for (const item of changed) {
  console.log(`${mode}: ${item.file} (${item.matches} URL, ${item.placeholders} placeholder)`);
}
console.log(`${mode} ${replacementCount} URL occurrence(s) in ${changed.length} file(s).`);
console.log(`${mode} ${placeholderCount} username placeholder occurrence(s).`);
console.log(`source: ${sourceBase}`);
console.log(`target: ${targetBase}`);
console.log(`${workflowMode}: second-account main-branch Pages trigger`);

if (replacementCount === 0 && placeholderCount === 0) {
  console.error("No source URLs or username placeholders were found. Confirm the command is running at the repository root.");
  process.exitCode = 2;
}
