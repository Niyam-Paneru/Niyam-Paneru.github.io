# Premium Proof Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the text-heavy service brochure with a premium, truthful portfolio containing two working browser-local engineering demos and one sanitized DentSignal case study, then deploy the verified static site to `https://niyampaneru.github.io/`.

**Architecture:** Keep the site dependency-light and static. Pure ES-module functions implement CSV repair and webhook retry simulation so Node's built-in test runner can verify the same logic the browser uses; small page controllers bind those functions to semantic HTML. A repository checker validates links, claims, metadata, assets, and deployment invariants before GitHub Pages publishes the exact reviewed files.

**Tech Stack:** Semantic HTML5, modern CSS, browser-native JavaScript ES modules, Node.js 20 built-in test runner, Playwright for browser smoke checks and proof captures, GitHub Actions/Pages.

---

## File map

- `assets/styles.css`: the shared premium visual system, responsive layouts, focus states, and reduced-motion behavior.
- `assets/script.js`: shared disclosure navigation and current-year behavior only.
- `assets/csv-rescue.js`: pure CSV parsing, validation, normalization, deduplication, serialization, and browser controller.
- `assets/webhook-lab.js`: pure JSON/event validation, duplicate detection, retry scheduling, and browser controller.
- `index.html`: concise homepage with actual proof imagery, three proof bands, bounded offers, and contact action.
- `csv-rescue.html`: interactive, browser-local CSV repair concept demo.
- `webhook-lab.html`: interactive, deterministic webhook concept demo.
- `case-study-dentsignal.html`: one truthful DentSignal project narrative using sanitized synthetic data.
- `404.html`: compact recovery page using the same shell.
- `assets/proof/*`: actual screenshots from the built demos plus sanitized DentSignal captures.
- `tests/csv-rescue.test.mjs`: unit coverage for CSV behavior and error boundaries.
- `tests/webhook-lab.test.mjs`: unit coverage for webhook validation and retry behavior.
- `tests/replace-base-url.test.mjs`: regression coverage for LF and CRLF workflow activation.
- `tests/browser-smoke.mjs`: desktop/mobile happy paths, error paths, download, keyboard navigation, and console checks.
- `scripts/check-site.mjs`: repository-wide static validation and prohibited-claim scan.
- `scripts/replace-base-url.mjs`: portable base-URL and deployment-trigger migration.
- `.github/workflows/pages.yml`: test and deploy the verified static site.
- `README.md` and `MIGRATION.md`: accurate local verification and destination deployment instructions.

### Task 1: Establish the test harness and portable migration helper

**Files:**
- Create: `package.json`
- Create: `tests/replace-base-url.test.mjs`
- Modify: `scripts/replace-base-url.mjs`

- [ ] **Step 1: Add a failing CRLF/LF regression test**

Create a Node test that imports `activatePagesTrigger` and asserts both newline styles preserve their original style:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { activatePagesTrigger } from "../scripts/replace-base-url.mjs";

for (const newline of ["\n", "\r\n"]) {
  test(`activates Pages push trigger with ${JSON.stringify(newline)}`, () => {
    const source = ["on:", "  workflow_dispatch:", "  # SECOND_ACCOUNT_PUSH_TRIGGER", ""].join(newline);
    const result = activatePagesTrigger(source);
    assert.equal(result.activated, true);
    assert.match(result.content, /push:/);
    assert.equal(result.content.includes(newline), true);
    assert.equal(result.content.includes("SECOND_ACCOUNT_PUSH_TRIGGER"), false);
  });
}
```

- [ ] **Step 2: Add scripts and run the focused test to prove failure**

Create `package.json` with `"type": "module"` and scripts `test:unit`, `check:site`, `check:syntax`, `test:browser`, and `check`. Run `node --test tests/replace-base-url.test.mjs`.

Expected: FAIL because `activatePagesTrigger` is not exported.

- [ ] **Step 3: Extract the portable helper and guard CLI execution**

Export `activatePagesTrigger(workflow)` from `scripts/replace-base-url.mjs`. Detect the dormant block with `/on:\r?\n  workflow_dispatch:\r?\n  # SECOND_ACCOUNT_PUSH_TRIGGER/`, derive the matched newline, and replace it with the active `push` plus `workflow_dispatch` block. Wrap command-line execution in an `isMain` guard so importing the module does not mutate files.

- [ ] **Step 4: Run the focused test and full unit command**

Run: `node --test tests/replace-base-url.test.mjs`

Expected: 2 tests pass for LF and CRLF.

- [ ] **Step 5: Commit the harness**

```powershell
git add package.json tests/replace-base-url.test.mjs scripts/replace-base-url.mjs
git commit -m "test: make site migration portable"
```

### Task 2: Implement CSV Rescue core with tests

**Files:**
- Create: `assets/csv-rescue.js`
- Create: `tests/csv-rescue.test.mjs`

- [ ] **Step 1: Write the failing parser and cleanup tests**

Cover these exact behaviors: quoted commas, quoted newlines, escaped quotes, an unclosed quote with a row number, inconsistent column counts, required header row, 512 KiB input cap, whitespace trimming, lowercase email normalization, ISO date zero-padding only when unambiguous, malformed email warning, blank required-value warning, ambiguous date warning, and exact duplicate removal after safe normalization.

```js
const result = cleanCsv('name,email,date\n Ada ,ADA@EXAMPLE.COM,2026-7-2\nAda,ada@example.com,2026-07-02');
assert.equal(result.rows.length, 1);
assert.equal(result.rows[0].email, "ada@example.com");
assert.equal(result.rows[0].date, "2026-07-02");
assert.equal(result.metrics.duplicatesRemoved, 1);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/csv-rescue.test.mjs`

Expected: FAIL because `assets/csv-rescue.js` does not exist.

- [ ] **Step 3: Implement pure CSV functions**

Export `MAX_INPUT_BYTES`, `parseCsv`, `cleanCsv`, and `serializeCsv`. Use a character-by-character state machine for RFC-4180-style quoted fields. Return deterministic objects containing `headers`, `rows`, `issues`, `metrics`, and `csv`; assign each issue `severity`, `code`, `row`, and `message`. Never guess ambiguous dates or repair malformed emails.

- [ ] **Step 4: Run tests and syntax validation**

Run:

```powershell
node --test tests/csv-rescue.test.mjs
node --check assets/csv-rescue.js
```

Expected: all CSV tests pass and syntax check exits 0.

- [ ] **Step 5: Commit the CSV core**

```powershell
git add assets/csv-rescue.js tests/csv-rescue.test.mjs
git commit -m "feat: add tested CSV repair engine"
```

### Task 3: Implement the CSV Rescue interface

**Files:**
- Create: `csv-rescue.html`
- Modify: `assets/csv-rescue.js`

- [ ] **Step 1: Add the semantic page structure**

Create a page labeled `Concept demo · Runs in your browser` with a labeled textarea, local file input, `Load sample`, `Repair CSV`, and disabled `Download cleaned CSV` controls; privacy copy must say data never leaves the browser. Add live regions for blocking errors and results, a metrics definition list, an issue list, and horizontally scrollable before/after tables.

- [ ] **Step 2: Bind the controller without hiding pure functions**

Add `initCsvRescue(document)` and run it only when `[data-csv-rescue]` exists. Enforce the input cap before processing, render row-specific issues, expose cleaned CSV in a readonly output textarea, and build the download from an in-memory Blob. If Blob download creation fails, keep the cleaned output selectable and announce the failure.

- [ ] **Step 3: Manually verify the happy and error paths**

Serve with `npx --yes http-server . -p 4173 -c-1`, then confirm the included sample shows issue counts, one duplicate removal, normalized output, and a downloadable file. Confirm empty input and an unclosed quote produce useful blocking messages and no download.

- [ ] **Step 4: Commit the interface**

```powershell
git add csv-rescue.html assets/csv-rescue.js
git commit -m "feat: add interactive CSV Rescue demo"
```

### Task 4: Implement Webhook Lab core with tests

**Files:**
- Create: `assets/webhook-lab.js`
- Create: `tests/webhook-lab.test.mjs`

- [ ] **Step 1: Write the failing validation and retry tests**

Cover invalid JSON, missing/non-string `id`, missing/non-string `event`, duplicate IDs within one supplied `Set`, supported statuses `200`, `429`, and `500`-`599`, rejected unsupported statuses, deterministic delays `1000`, `2000`, `4000` capped at `8000`, successful termination, and `Needs attention` when the maximum attempt count is exhausted.

```js
const simulation = simulateWebhook({ statuses: [429, 500, 200], maxAttempts: 4, baseDelayMs: 1000, maxDelayMs: 8000 });
assert.deepEqual(simulation.attempts.map((item) => item.waitMs), [1000, 2000, 0]);
assert.equal(simulation.outcome, "Delivered");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/webhook-lab.test.mjs`

Expected: FAIL because `assets/webhook-lab.js` does not exist.

- [ ] **Step 3: Implement pure webhook functions**

Export `validateEvent`, `registerEventId`, `parseStatusSequence`, `calculateBackoff`, and `simulateWebhook`. Never call `fetch`, persist payloads, or use randomness. Return a structured attempt timeline containing attempt number, status, decision, wait time, and terminal outcome.

- [ ] **Step 4: Run tests and syntax validation**

Run:

```powershell
node --test tests/webhook-lab.test.mjs
node --check assets/webhook-lab.js
```

Expected: all webhook tests pass and syntax check exits 0.

- [ ] **Step 5: Commit the webhook core**

```powershell
git add assets/webhook-lab.js tests/webhook-lab.test.mjs
git commit -m "feat: add deterministic webhook simulator"
```

### Task 5: Implement the Webhook Lab interface

**Files:**
- Create: `webhook-lab.html`
- Modify: `assets/webhook-lab.js`

- [ ] **Step 1: Add the semantic page structure**

Create a page labeled `Concept demo · Deterministic simulation` with a JSON textarea, status-sequence input, `Load sample`, and `Run simulation` controls. Show validation, payload summary, attempt timeline, and final outcome together; state `No network request. No payload stored.`

- [ ] **Step 2: Bind a session-only controller**

Add `initWebhookLab(document)` with an in-memory `Set`. Render duplicate delivery as an explicit warning, unsupported status as a blocking error, each retry wait in seconds, and either `Delivered` or `Needs attention` text so color is never the sole signal.

- [ ] **Step 3: Manually verify the happy and error paths**

Using the local server, run `429, 500, 200` and confirm the deterministic timeline. Run the same event ID again and confirm duplicate detection. Confirm invalid JSON, missing fields, unsupported `418`, and exhausted retries remain truthful and make no network request.

- [ ] **Step 4: Commit the interface**

```powershell
git add webhook-lab.html assets/webhook-lab.js
git commit -m "feat: add interactive Webhook Lab demo"
```

### Task 6: Build the shared premium visual system

**Files:**
- Modify: `assets/styles.css`
- Modify: `assets/script.js`
- Modify: `assets/favicon.svg`

- [ ] **Step 1: Define tokens and typography**

Use CSS custom properties for limestone `#F1EEE7`, paper `#FAF9F5`, carbon `#14231E`, stone `#45504A`, rule `#C9CEC8`, mineral `#245A48`, ochre `#B7832F`, and slate `#536B7E`. Use an intentional system sans-serif fallback unless licensed local font files are added with their license. Set readable measure, fluid display sizes with `clamp`, and tabular numerals for metrics.

- [ ] **Step 2: Implement editorial layouts rather than card grids**

Create the two-fifths/three-fifths hero, tiered screen composition, asymmetric proof bands, compact offer rows, project narrative grids, demo workbenches, and table containers. Keep corners at 0-8px, borders at 1px, and shadows limited to screen-depth explanation. Do not use gradients, red, purple, magenta, neon, glowing shapes, or equal floating feature cards.

- [ ] **Step 3: Implement responsive and accessible states**

At 900px collapse proof bands to two columns; at 680px place proof after the headline, remove overlaps, and make every project a vertical sequence. Provide 44px controls, `:focus-visible`, hover/active/disabled/error/success styles, skip link, keyboard-operable disclosure navigation, and `prefers-reduced-motion: reduce` overrides.

- [ ] **Step 4: Keep shared JavaScript bounded**

`assets/script.js` must only control navigation disclosure, close it on link/Escape/outside-click, synchronize `aria-expanded`, and set the year. It must not add trackers, external calls, scroll-jacking, or staged entrances.

- [ ] **Step 5: Run syntax checks and commit**

Run `node --check assets/script.js`; expected exit 0.

```powershell
git add assets/styles.css assets/script.js assets/favicon.svg
git commit -m "feat: add premium editorial site system"
```

### Task 7: Replace the homepage and project narrative pages

**Files:**
- Modify: `index.html`
- Modify: `case-study-dentsignal.html`
- Modify: `404.html`
- Delete: `voice-agent-qa.html`
- Delete: `sample-fastapi-api-repair.html`
- Delete: `sample-voice-agent-qa.html`
- Delete: `sample-web-app-launch-blocker.html`
- Delete: `sample-workflow-reliability.html`
- Delete: `samples/fastapi-api-debugging-repair-report.md`
- Delete: `samples/voice-agent-qa-report.md`
- Delete: `samples/web-app-launch-blocker-repair-report.md`
- Delete: `samples/workflow-reliability-repair-report.md`

- [ ] **Step 1: Rewrite the homepage above the fold**

Use headline `I make broken software shippable.` and supporting line `React, APIs, deployments, CSVs, and webhooks—diagnosed and shipped without the theatre.` Add one primary `Send the bug` mail action and a tiered composition that references actual proof images only.

- [ ] **Step 2: Add three asymmetric proof bands**

DentSignal appears once with `Product build · Synthetic demo data` and the caption `Real interface. Synthetic demo data.` CSV Rescue uses `Concept demo · Runs in your browser`; Webhook Lab uses `Concept demo · Deterministic simulation`. Each band contains only a short problem, short result, actual visual, and direct page action.

- [ ] **Step 3: Add bounded offers and contact**

Show three starting scopes: CSV/data cleanup `$35–75`, API/webhook diagnosis `$50–125`, and React/deploy repair `$75–150`. State that final price depends on a reproduced issue and bounded acceptance check. Expose `niyampaneru79@gmail.com` and a prefilled `mailto:`; do not add a form backend or GitHub link.

- [ ] **Step 4: Rewrite the DentSignal case page truthfully**

Use the five-part short narrative: problem, detected operator friction, unified interface fix, verified implementation boundaries, result. Do not claim clients, clinics, revenue, production adoption, or patient outcomes. Keep the truth caption adjacent to every DentSignal image.

- [ ] **Step 5: Replace 404 and remove obsolete brochure pages**

Keep one short recovery message and links to `/`, `/csv-rescue.html`, and `/webhook-lab.html`. Remove the obsolete text-heavy public pages and reports so they cannot be mistaken for current proof.

- [ ] **Step 6: Commit the content replacement**

```powershell
git add -A
git commit -m "feat: replace brochure with proof portfolio"
```

### Task 8: Add real proof captures

**Files:**
- Create: `assets/proof/dentsignal-dashboard-desktop.png`
- Create: `assets/proof/dentsignal-dashboard-mobile.png`
- Create: `assets/proof/csv-rescue-desktop.png`
- Create: `assets/proof/webhook-lab-desktop.png`
- Modify: `index.html`
- Modify: `case-study-dentsignal.html`

- [ ] **Step 1: Copy only sanitized DentSignal fixture captures**

Copy `dashboard-desktop.png` and `dashboard-mobile.png` from `C:\Users\thely\Downloads\14_days_sprint\.tmp-dentsignal-proof\` into `assets/proof/`. Do not open or modify DentSignal source and do not copy private variants.

- [ ] **Step 2: Capture the actual concept demos**

Run the local server, load each sample in Chromium at 1440×1000, and capture the built CSV Rescue results and Webhook Lab retry timeline. Save those actual screenshots to `assets/proof/`; do not copy the generated composition references.

- [ ] **Step 3: Wire proof with accurate alternatives and captions**

Use specific alt text describing the visible interface. Mark cropped decorative duplicates with empty alt text. Keep `Real interface. Synthetic demo data.` visible beside DentSignal proof and `Concept demo` visible beside both fictional tools.

- [ ] **Step 4: Commit the proof assets**

```powershell
git add assets/proof index.html case-study-dentsignal.html
git commit -m "feat: add truthful interface proof"
```

### Task 9: Replace repository validation with portfolio invariants

**Files:**
- Modify: `scripts/check-site.mjs`
- Create: `tests/site-check.test.mjs`

- [ ] **Step 1: Write failing checker tests using temporary fixtures**

Assert the checker rejects: a public `github.com` profile link, `CNAME`, missing concept labels, DentSignal imagery without its truth caption, broken local references, duplicate IDs, unresolved username tokens, invented `testimonial`/`revenue`/`trusted by` claims, missing canonical/OG URLs, and possible credential patterns. Assert it accepts the reviewed repository.

- [ ] **Step 2: Run the checker tests to verify old assumptions fail**

Run: `node --test tests/site-check.test.mjs`

Expected: FAIL because the current checker requires deleted brochure pages and offers.

- [ ] **Step 3: Export and implement `checkSite(root)`**

Preserve recursive asset/link/fragment/metadata/credential checks. Require exactly the current public pages plus `MIGRATION.md`, the migration script, proof images, the two demo modules, and their truthful labels. Reject obsolete page filenames and prohibited proof claims. Return a failure array to tests and keep the CLI exit behavior.

- [ ] **Step 4: Run static validation**

Run:

```powershell
node --test tests/site-check.test.mjs
npm run check:site
npm run check:syntax
```

Expected: all tests pass; checker reports the inspected HTML/file count; syntax commands exit 0.

- [ ] **Step 5: Commit the new invariants**

```powershell
git add scripts/check-site.mjs tests/site-check.test.mjs
git commit -m "test: enforce truthful portfolio proof"
```

### Task 10: Add browser smoke verification and review the visuals

**Files:**
- Create: `tests/browser-smoke.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/pages.yml`

- [ ] **Step 1: Add deterministic Playwright smoke checks**

Start a static server in the test process and verify: no console/page errors; 1440px and 390px layouts have no horizontal page overflow; disclosure navigation opens/closes by keyboard; CSV sample repairs and enables download; empty/unclosed CSV errors block it; webhook sample produces `Delivered`; repeated ID reports duplicate; invalid JSON and exhausted retries report errors/outcome; reduced-motion reports the override.

- [ ] **Step 2: Run the browser suite**

Run: `npm run test:browser`

Expected: all browser checks pass in Chromium. If the environment lacks a browser, install only Playwright Chromium locally and rerun; do not add a production runtime dependency.

- [ ] **Step 3: Inspect desktop, tablet, and mobile screenshots**

Review 1440px, 768px, and 390px captures. Correct clipping, unreadable interface crops, weak hierarchy, repeated card rhythm, red/purple/gradient leakage, target sizes below 44px, and focus states. Re-run smoke checks after every visual correction.

- [ ] **Step 4: Make Pages run the complete non-browser gate**

Update the workflow to use Node 20, `npm ci`, `npm run test:unit`, `npm run check:site`, and `npm run check:syntax` before upload. Keep browser verification local if a bundled browser would unnecessarily slow deployment.

- [ ] **Step 5: Commit browser verification**

```powershell
git add tests/browser-smoke.mjs package.json package-lock.json .github/workflows/pages.yml assets/styles.css
git commit -m "test: verify portfolio in the browser"
```

### Task 11: Update operating documentation and run the source completion gate

**Files:**
- Modify: `README.md`
- Modify: `MIGRATION.md`

- [ ] **Step 1: Document the actual project and privacy boundaries**

Explain the five public pages, local commands, two browser-local demos, synthetic DentSignal evidence, absence of analytics/backend, and destination Pages URL. Remove references to deleted samples and old offer lanes.

- [ ] **Step 2: Document a reversible destination migration**

Give exact commands for `node scripts/replace-base-url.mjs NiyamPaneru --check`, copying only reviewed tracked files into the empty destination repository, rerunning all checks there, committing, pushing `main`, enabling GitHub Actions Pages, and verifying the live URL. Explicitly state no `CNAME` and no DentSignal domain transfer.

- [ ] **Step 3: Run the full source gate**

Run:

```powershell
npm ci
npm run check
npm run test:browser
git diff --check
git status --short
```

Expected: all tests/checks pass, no whitespace errors, and only the intended documentation changes remain before commit.

- [ ] **Step 4: Commit documentation**

```powershell
git add README.md MIGRATION.md
git commit -m "docs: document verified portfolio deployment"
```

### Task 12: Deploy to the destination GitHub Pages repository

**Files:**
- Destination repository: `C:\Users\thely\Downloads\14_days_sprint\service-site-destination`

- [ ] **Step 1: Verify destination identity and scope**

Run `git remote -v`, `git status --short --branch`, `gh auth status`, and `gh repo view NiyamPaneru/NiyamPaneru.github.io`. Expected: the destination repository is empty or contains only intended prior site files, authenticated identity has write access, and no `CNAME` exists.

- [ ] **Step 2: Prepare a reviewed destination tree**

Copy the source's reviewed tracked files without `.git`, generated design references, temporary screenshots, or DentSignal source. Run `node scripts/replace-base-url.mjs NiyamPaneru`, then scan for `SECOND_USERNAME`, the old base URL, `CNAME`, GitHub profile links, credentials, and prohibited claims.

- [ ] **Step 3: Re-run the full destination gate**

Run `npm ci`, `npm run check`, `npm run test:browser`, and `git diff --check` from the destination. Expected: all pass using destination canonical URLs and the active main-branch Pages trigger.

- [ ] **Step 4: Commit and push only the verified static site**

```powershell
git add -A
git commit -m "feat: launch premium proof portfolio"
git push origin main
```

- [ ] **Step 5: Verify GitHub Actions and the live site**

Wait for the Pages workflow to succeed. Check `https://niyampaneru.github.io/`, its title, local asset responses, all three project links, CSV happy/error paths, Webhook happy/error paths, and mobile layout. Record the destination commit SHA and workflow URL. Do not claim deployment from a local preview.

### Task 13: Repair the private acquisition package for the real site

**Files:**
- Repository: `C:\Users\thely\Downloads\14_days_sprint\client-acquisition-private`
- Modify: `tests/automation.test.mjs`
- Modify: `upwork-profile-package.md`
- Modify: opportunity/prospect files selected by repository tests and current verification

- [ ] **Step 1: Fix the known CRLF-only test assumption with a regression**

Change paragraph splitting from `"\n\n"` to `/\r?\n\r?\n/`, run the focused test, then run `npm test`. Expected: all 17 current automation tests pass before content changes.

- [ ] **Step 2: Replace stale Upwork specialized-profile advice**

Rewrite the package as one concise main profile whose first roughly 250 characters communicate bounded software repair, plus Project Catalog drafts for CSV cleanup, webhook/API diagnosis, and React/deployment repair. Remove instructions to create Specialized Profiles, which Upwork removed in 2026. Keep all applications and purchases explicitly `REVIEW REQUIRED`.

- [ ] **Step 3: Re-rank opportunities by honest experience fit**

Demote roles requiring 3+, 8+, senior, lead, or scaled-systems experience. Add only currently verified junior/internship or bounded-contract opportunities from official sources, including Cherdung's current Kathmandu internship if still open. Record source URL, verification date, requirement fit, location, cost, and a truthful risk note. Never describe nine months of project work as years of employment.

- [ ] **Step 4: Replace every temporary portfolio URL with the live site**

Change proof URLs to `https://niyampaneru.github.io/`, choose the most relevant project page per draft, shorten outreach to problem/proof/action, and preserve `REVIEW REQUIRED`. Do not send messages, buy Connects, start ads, or contact prospects.

- [ ] **Step 5: Protect secrets without printing them**

Use `git ls-files .env` and inspect `.gitignore` only. If `.env` is tracked, remove it from version control without displaying contents, add it to `.gitignore`, add a key-name-only `.env.example` only if the repository needs one, and verify no secret values appear in the diff.

- [ ] **Step 6: Run tests and commit the acquisition repair**

Run `npm test`, the repository credential scan, `git diff --check`, `git status --short`, and `git diff --stat`. Expected: tests pass, no secret values, no sent-state changes, and only the intended private acquisition files changed. Commit with `git commit -m "fix: align acquisition kit with verified portfolio"`.

### Task 14: Perform the completion audit

**Files:**
- Review only: both repositories, live site, GitHub Actions result

- [ ] **Step 1: Re-run every local gate at both final SHAs**

Record `npm run check`, `npm run test:browser`, `git diff --check`, `git status --short`, `git log -1 --oneline`, and `git diff --stat HEAD^ HEAD` in each repository.

- [ ] **Step 2: Re-check the live deployment independently**

Open the live URL without relying on local files. Confirm title, proof images, canonical URL, navigation, contact link, three project pages, both demo happy/error paths, mobile behavior, and zero console errors.

- [ ] **Step 3: Audit the original requirements line by line**

Confirm: fixed-scope service rather than new SaaS; premium neutral palette; little homepage text; no GitHub profile link; three visually distinct projects; DentSignal shown once with synthetic caption; two actual local tools; problem/diagnosis/fix/result on every project; no invented commercial proof; no paid action; no sent outreach; destination deployed; job/outreach materials experience-honest.

- [ ] **Step 4: Report exact outcomes and limitations**

Provide source SHA, destination SHA, private-acquisition SHA, live workflow state, live URL, test counts, changed-file summaries, and any unresolved limitation. State plainly that a portfolio and outreach system improve the test but do not guarantee income, and recommend applying to ordinary junior/internship roles in parallel.
