#!/usr/bin/env node

import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const sourceBase = ["https://niyam-paneru", "github", "io"].join(".");
const usernameToken = ["SECOND", "USERNAME"].join("_");
const allowedExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".svg",
  ".txt",
  ".yaml",
  ".yml",
]);
const skippedDirectories = new Set([".git", "node_modules"]);

export function activatePagesTrigger(workflow) {
  const dormant = /on:(\r?\n)  workflow_dispatch:\1  # SECOND_ACCOUNT_PUSH_TRIGGER/;
  const match = workflow.match(dormant);

  if (match) {
    const newline = match[1];
    const active = [
      "on:",
      "  push:",
      '    branches: ["main"]',
      "  workflow_dispatch:",
    ].join(newline);

    return {
      activated: true,
      content: workflow.replace(dormant, active),
    };
  }

  if (/on:\r?\n  push:\r?\n    branches: \["main"\]\r?\n  workflow_dispatch:/.test(workflow)) {
    return { activated: false, content: workflow };
  }

  throw new Error(
    "Pages workflow has neither the reviewed dormant marker nor the active main-branch trigger.",
  );
}

function validateUsername(username) {
  if (!username) throw new Error("A GitHub username is required.");
  if (username === usernameToken) {
    throw new Error("Replace the example username token with the real destination username.");
  }
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username) || username.includes("--")) {
    throw new Error("The username must use GitHub's letters, digits, and single-hyphen format.");
  }
}

async function walk(directory, onFile) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(path, onFile);
    } else if (entry.isFile() && allowedExtensions.has(extname(entry.name))) {
      await onFile(path);
    }
  }
}

export async function replaceBaseUrl({ root = process.cwd(), username, checkOnly = false }) {
  validateUsername(username);

  const targetBase = `https://${username.toLowerCase()}.github.io`;
  const changed = [];
  let replacementCount = 0;
  let tokenCount = 0;

  await walk(root, async (path) => {
    const original = await readFile(path, "utf8");
    const matches = original.split(sourceBase).length - 1;
    const tokens = original.split(usernameToken).length - 1;
    if (matches === 0 && tokens === 0) return;

    replacementCount += matches;
    tokenCount += tokens;
    changed.push({ file: relative(root, path), matches, tokens });
    if (!checkOnly) {
      const updated = original
        .split(sourceBase).join(targetBase)
        .split(usernameToken).join(username);
      await writeFile(path, updated, "utf8");
    }
  });

  const workflowPath = join(root, ".github", "workflows", "pages.yml");
  const workflow = await readFile(workflowPath, "utf8");
  const trigger = activatePagesTrigger(workflow);
  if (trigger.activated && !checkOnly) await writeFile(workflowPath, trigger.content, "utf8");

  return {
    changed,
    replacementCount,
    tokenCount,
    targetBase,
    workflowActivation: trigger.activated,
  };
}

async function main() {
  const username = process.argv[2];
  const checkOnly = process.argv.includes("--check");

  try {
    const result = await replaceBaseUrl({ username, checkOnly });
    const mode = checkOnly ? "would update" : "updated";
    for (const item of result.changed) {
      console.log(`${mode}: ${item.file} (${item.matches} URL, ${item.tokens} username token)`);
    }
    console.log(`${mode} ${result.replacementCount} URL occurrence(s) in ${result.changed.length} file(s).`);
    console.log(`${mode} ${result.tokenCount} username token occurrence(s).`);
    console.log(`source: ${sourceBase}`);
    console.log(`target: ${result.targetBase}`);
    console.log(
      `${result.workflowActivation ? (checkOnly ? "would activate" : "activated") : "already active"}: destination main-branch Pages trigger`,
    );

    if (result.replacementCount === 0 && result.tokenCount === 0) process.exitCode = 2;
  } catch (error) {
    console.error(error.message);
    console.error("Usage: node scripts/replace-base-url.mjs <real-github-username> [--check]");
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) await main();
