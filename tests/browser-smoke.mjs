import assert from "node:assert/strict";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function staticServer() {
  return createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const file = normalize(join(root, relativePath));

    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
      response.writeHead(404, { "content-type": "text/html; charset=utf-8" });
      createReadStream(join(root, "404.html")).pipe(response);
      return;
    }

    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": contentTypes[extname(file)] ?? "application/octet-stream",
    });
    createReadStream(file).pipe(response);
  });
}

async function listen(server) {
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  return `http://127.0.0.1:${server.address().port}`;
}

async function close(server) {
  await new Promise((resolveClose, rejectClose) =>
    server.close((error) => (error ? rejectClose(error) : resolveClose())),
  );
}

function collectErrors(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  return errors;
}

async function assertNoOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert.equal(dimensions.scrollWidth, dimensions.clientWidth, `${label} has horizontal overflow`);
}

const requestedBaseUrl = process.env.PORTFOLIO_BASE_URL?.replace(/\/+$/, "");
const server = requestedBaseUrl ? null : staticServer();
const baseUrl = requestedBaseUrl ?? (await listen(server));
let browser;

try {
  browser = await chromium.launch({ channel: "chrome", headless: true });

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const desktopErrors = collectErrors(desktop);
  await desktop.goto(baseUrl, { waitUntil: "networkidle" });
  await assertNoOverflow(desktop, "desktop home");
  assert.equal(await desktop.title(), "Niyam Paneru | Software repair and launch support");
  assert.equal(await desktop.locator(".proof-band").count(), 3);
  assert.equal(await desktop.locator(".engineering-proof-card").count(), 5);
  assert.equal(await desktop.locator('a[href*="github.com"]').count(), 0);
  assert.equal(await desktop.getByText("Real interface. Synthetic demo data.").count(), 1);
  assert.deepEqual(desktopErrors, []);
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const mobileErrors = collectErrors(mobile);
  await mobile.emulateMedia({ reducedMotion: "reduce" });
  await mobile.goto(baseUrl, { waitUntil: "networkidle" });
  await assertNoOverflow(mobile, "mobile home");
  const menu = mobile.locator("[data-nav-toggle]");
  assert.equal(await menu.textContent(), "Menu");
  const menuBox = await menu.boundingBox();
  assert.ok(menuBox.width >= 44 && menuBox.height >= 44, "mobile menu target is smaller than 44px");
  await menu.focus();
  await mobile.keyboard.press("Enter");
  assert.equal(await menu.getAttribute("aria-expanded"), "true");
  await mobile.keyboard.press("Escape");
  assert.equal(await menu.getAttribute("aria-expanded"), "false");
  const reducedDurationSeconds = await mobile.locator(".button").first().evaluate(
    (element) => Number.parseFloat(getComputedStyle(element).transitionDuration),
  );
  assert.ok(reducedDurationSeconds <= 0.001, "reduced-motion transition is not effectively disabled");
  assert.deepEqual(mobileErrors, []);
  await mobile.close();

  const csv = await browser.newPage({ viewport: { width: 1200, height: 900 }, acceptDownloads: true });
  const csvErrors = collectErrors(csv);
  await csv.goto(`${baseUrl}/csv-rescue.html`, { waitUntil: "networkidle" });
  await csv.getByRole("button", { name: "Load synthetic sample" }).click();
  await csv.getByRole("button", { name: "Repair CSV" }).click();
  await assertNoOverflow(csv, "CSV demo");
  await assert.doesNotReject(async () =>
    assert.match(await csv.locator("[data-status]").textContent(), /3 cleaned rows/),
  );
  assert.equal(await csv.locator("[data-download]").getAttribute("aria-disabled"), "false");
  const [download] = await Promise.all([
    csv.waitForEvent("download"),
    csv.locator("[data-download]").click(),
  ]);
  assert.equal(download.suggestedFilename(), "csv-rescue-cleaned.csv");

  await csv.locator("[data-csv-input]").fill("");
  await csv.getByRole("button", { name: "Repair CSV" }).click();
  assert.match(await csv.locator("[data-status]").textContent(), /header row/i);
  await csv.locator("[data-csv-input]").fill('name,email\n"Ada,ada@example.com');
  await csv.getByRole("button", { name: "Repair CSV" }).click();
  assert.match(await csv.locator("[data-status]").textContent(), /Unclosed quoted field starting on row 2/);
  assert.deepEqual(csvErrors, []);
  await csv.close();

  const webhook = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const webhookErrors = collectErrors(webhook);
  await webhook.goto(`${baseUrl}/webhook-lab.html`, { waitUntil: "networkidle" });
  await webhook.getByRole("button", { name: "Load synthetic event" }).click();
  await webhook.getByRole("button", { name: "Run simulation" }).click();
  assert.equal(await webhook.locator("[data-outcome]").textContent(), "Delivered");
  await webhook.getByRole("button", { name: "Run simulation" }).click();
  assert.match(await webhook.locator("[data-duplicate-state]").textContent(), /Duplicate ID/);

  await webhook.locator("[data-payload-input]").fill('{"id":');
  await webhook.getByRole("button", { name: "Run simulation" }).click();
  assert.match(await webhook.locator("[data-status]").textContent(), /JSON could not be parsed/);

  await webhook.locator("[data-payload-input]").fill('{"id":"evt_retry","event":"invoice.paid"}');
  await webhook.locator("[data-status-input]").fill("500, 503, 503");
  await webhook.locator("[data-max-attempts]").fill("3");
  await webhook.getByRole("button", { name: "Run simulation" }).click();
  assert.equal(await webhook.locator("[data-outcome]").textContent(), "Needs attention");
  await assertNoOverflow(webhook, "webhook demo");
  assert.deepEqual(webhookErrors, []);
  await webhook.close();

  const casePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const caseErrors = collectErrors(casePage);
  await casePage.goto(`${baseUrl}/case-study-dentsignal.html`, { waitUntil: "networkidle" });
  await assertNoOverflow(casePage, "DentSignal case study");
  assert.equal(await casePage.getByText("Real interface. Synthetic demo data.").count(), 1);
  assert.deepEqual(caseErrors, []);
  await casePage.close();

  for (const path of [
    "case-study-deployment-drift.html",
    "case-study-ci-gate-recovery.html",
    "case-study-cloud-provider-config.html",
    "case-study-async-response-ownership.html",
    "case-study-webhook-token-hardening.html",
  ]) {
    const engineeringCase = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const engineeringErrors = collectErrors(engineeringCase);
    await engineeringCase.goto(`${baseUrl}/${path}`, { waitUntil: "networkidle" });
    await assertNoOverflow(engineeringCase, path);
    assert.equal(
      await engineeringCase.getByText("DentSignal engineering case study", { exact: false }).count(),
      1,
    );
    assert.ok(
      await engineeringCase.locator('a[href^="https://github.com/Niyam-Paneru/dentsignal/pull/"]').count(),
      `${path} is missing an exact pull-request link`,
    );
    assert.deepEqual(engineeringErrors, []);
    await engineeringCase.close();
  }

  console.log(
    `Browser smoke passed at ${baseUrl}: desktop, mobile, CSV, webhook, download, and six DentSignal truth boundaries.`,
  );
} finally {
  if (browser) await browser.close();
  if (server) await close(server);
}
