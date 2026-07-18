# Premium Proof Portfolio Design

Date: 2026-07-18
Status: approved direction

## Purpose

Build a compact, premium portfolio that helps a small SaaS founder or agency operator decide within roughly 30 seconds whether Niyam can fix a bounded software problem. The site must demonstrate value through visible interfaces, working demos, and reproducible tests instead of long claims.

The portfolio is a sales asset for a 14-day service experiment. It is not a new SaaS product, a DentSignal relaunch, or a claim of past client success.

## Success Criteria

- A visitor immediately understands the offer: diagnose and ship bounded React, API, deployment, data, and webhook fixes.
- The first viewport contains real interface evidence, one clear action, and little copy.
- Three visually distinct projects demonstrate three kinds of engineering work.
- The two fictional projects are usable browser tools, not decorative screenshots.
- DentSignal appears once and is explicitly described as a real interface using synthetic demo data.
- No public GitHub profile is required for credibility.
- The site works on mobile, passes the repository checks, and can deploy to GitHub Pages without paid infrastructure.

## Evidence Rules

### Allowed

- A sanitized DentSignal interface captured from its local synthetic fixture.
- Fictional brands and synthetic data clearly labeled `Concept demo`.
- Working inputs, deterministic outputs, browser-local processing, automated tests, and dated test evidence.
- Short, verifiable statements about the implementation shown on the page.

### Forbidden

- Presenting a concept as paid client work.
- Inventing customers, testimonials, revenue, adoption, clinic outcomes, or review scores.
- Copying another designer's brand, screenshots, copy, or proprietary assets.
- Showing production data, PHI, credentials, internal URLs, or private repository details.
- Calling generated imagery proof. Generated imagery may guide composition only.

## Information Architecture

### Home page

1. Compact navigation: name, Work, Offers, Contact, and `Send the bug`.
2. Hero: concise outcome statement on the left and a tiered composition of three actual project interfaces on the right.
3. Proof index: three asymmetric project bands, each with a visual, one-sentence problem, one-sentence result, and a direct project link.
4. Offers: three bounded starting points with scope language, not a large pricing table.
5. Contact: visible email address and prefilled email action.

Primary headline: `I make broken software shippable.`

Supporting line: `React, APIs, deployments, CSVs, and webhooks—diagnosed and shipped without the theatre.`

### Project pages

Every page uses the same short narrative:

1. The problem.
2. What the interface detected.
3. What changed.
4. The result.
5. Try the working demo or inspect the visible test evidence.

Long documentation, generic capability lists, and repeated biography sections are excluded.

## Project 1: DentSignal

Label: `Product build · Synthetic demo data`

Use one sanitized dashboard capture from the local DentSignal fixture. The case page shows the interface problem, the system-level solution, and the implementation boundaries without claiming a client outcome.

The visual story should cover:

- problem: fragmented call operations and unclear follow-up state;
- solution: a unified operator interface with calls, appointments, analytics, and guarded workflows;
- engineering: React/Next.js interface, API-backed state, responsive views, and automated validation where directly verified;
- truth caption: `Real interface. Synthetic demo data.`

Do not show internal clinic identities, production claims, real patient data, private logs, or repository links.

## Project 2: CSV Rescue

Label: `Concept demo · Runs in your browser`

CSV Rescue is a fictional data-cleaning product implemented as a real static browser tool. It demonstrates a bounded import-repair workflow.

### Problem shown

A customer export contains inconsistent whitespace, duplicate rows, blank required values, malformed email addresses, and inconsistent dates. A normal spreadsheet hides the impact until import fails.

### Solution shown

- paste CSV text or load the included synthetic sample;
- parse quoted fields correctly;
- display detected issue counts and affected rows;
- normalize safe whitespace and email casing;
- remove exact duplicate records;
- show a before-and-after preview;
- download the cleaned CSV;
- keep all data in the browser with no upload or persistence.

Validation must distinguish warnings from safe automatic fixes. Ambiguous values are flagged rather than silently rewritten.

### Error handling

- Empty input explains what to paste.
- Unclosed quotes or inconsistent column counts produce a row-specific parse error.
- A missing header blocks cleanup.
- A download failure leaves the cleaned output selectable and copyable.
- Large input is capped with a clear local-processing limit.

## Project 3: Webhook Lab

Label: `Concept demo · Deterministic simulation`

Webhook Lab is a fictional reliability product implemented as a real static browser tool. It demonstrates debugging and retry reasoning without making network requests.

### Problem shown

An event is delivered more than once, receives a temporary failure, or never reaches an obvious success state. Raw logs make the failure path difficult to understand.

### Solution shown

- paste JSON or load the included synthetic sample;
- validate JSON syntax and required `id` and `event` fields;
- detect duplicate event IDs within the current browser session;
- simulate attempts for `429`, `500`, and `200` responses;
- calculate a deterministic exponential-backoff schedule with a maximum delay;
- display payload, validation, attempt timeline, and final outcome together;
- make no external request and store no payload.

### Error handling

- Invalid JSON reports the parser location when available.
- Missing required fields remain blocking validation errors.
- Unsupported status codes are explained instead of silently mapped.
- Retry limits produce a terminal `Needs attention` state rather than a false success.

## Visual System

### Direction

The visual language is an editorial product portfolio: warm, precise, and technical. It must feel intentionally art-directed rather than like a generic dark developer template or AI landing page.

### Palette

- canvas: warm limestone `#F1EEE7`;
- elevated surface: soft paper `#FAF9F5`;
- primary ink: carbon green-black `#14231E`;
- secondary ink: deep stone `#45504A`;
- rules: cool stone `#C9CEC8`;
- primary action: mineral green `#245A48` with a verified accessible text color;
- warning accent: restrained ochre `#B7832F`;
- Webhook Lab accent: muted slate blue `#536B7E`;
- DentSignal accent: restrained teal derived from its real interface.

Red, burgundy, purple, magenta, neon cyan, gradients, glowing blobs, and gold-luxury styling are explicitly excluded.

### Typography

- Display: Familjen Grotesk, self-hosted with its license if used.
- Body/UI: Atkinson Hyperlegible Next, self-hosted with its license if used.
- Fall back to a carefully ordered system sans-serif stack if font files cannot be shipped cleanly.

Headlines should be large enough to establish hierarchy but must not consume the page as decorative text. Interface labels use compact uppercase sparingly.

### Shape and surface

- Mostly square or lightly rounded corners.
- Thin 1px rules and exact alignment.
- Restrained shadow only where screen depth needs explanation.
- No repeated floating feature cards.
- Each project uses a different composition while sharing spacing and type rules.

## Layout and Responsive Behavior

- Desktop hero: copy occupies roughly two-fifths; the three-screen proof composition occupies three-fifths.
- Project index: horizontal editorial bands rather than equal card columns.
- Tablet: hero screens compress without illegible text; project bands become a two-column text/visual layout.
- Mobile: proof follows the headline, each project becomes one vertical sequence, and decorative overlaps are removed.
- Content width, line length, and interface crop must preserve readability at every breakpoint.
- Navigation becomes a keyboard-operable disclosure with a visible close state.

## Interaction and Motion

- CTA, navigation, demo controls, tabs, and downloads have visible hover, focus, active, disabled, error, and success states.
- Motion is limited to small screen shifts, state changes, and result transitions.
- No scroll-jacking, cursor replacement, parallax, or staged entrance sequence.
- `prefers-reduced-motion: reduce` disables nonessential transitions.

## Accessibility

- Target WCAG 2.2 AA contrast.
- Use semantic landmarks, heading order, labels, status messages, and real buttons/links.
- All functions are keyboard accessible.
- Interactive targets are at least 44 by 44 CSS pixels where practical.
- Color never carries an error or result meaning alone.
- Screenshots have useful alt text; decorative interface fragments use empty alt text.
- Demo tables remain understandable on narrow screens through scroll containers and persistent labels.

## Data Flow and Privacy

Both concept demos are static, client-side applications:

1. The visitor provides or loads synthetic input.
2. Pure JavaScript functions parse and validate the input.
3. The page renders a local transformation or simulation.
4. Optional CSV output is created with an in-memory Blob.
5. No data is sent, stored, tracked, or logged externally.

The portfolio has no analytics, cookies, contact form backend, or external JavaScript dependency.

## Test Strategy

- Unit tests cover quoted CSV parsing, duplicate removal, safe normalization, invalid rows, JSON validation, duplicate event IDs, retry decisions, backoff caps, and terminal states.
- Repository checks assert required pages, truthful labels, no placeholder links, no public GitHub links, and no prohibited proof claims.
- JavaScript syntax checks run for every script.
- Browser checks cover desktop and mobile layouts, keyboard navigation, demo happy paths, demo error paths, download creation, console errors, and reduced motion.
- Visual review compares actual browser screenshots with the approved composition, replacing all generated concept imagery before publication.
- Deployment verification confirms the destination URL, expected title, project links, asset loads, and both demos in the live GitHub Pages build.

## Deployment Scope

- Build in the source repository on `codex/premium-proof-portfolio`.
- Keep DentSignal source and production systems read-only.
- Migrate the verified static build to the intended public GitHub Pages repository only after local checks pass.
- Do not configure or transfer the DentSignal domain.
- Do not publish outreach, send messages, purchase platform credits, or change paid infrastructure as part of the site deployment.

## Mock Fidelity Inventory

The implementation preserves these traits from the approved neutral mock:

- warm limestone shell and carbon ink;
- concise left-aligned hero statement;
- a right-side tier of three distinct real interfaces;
- tiny `Concept demo`, `Live demo`, and `Tested` labels;
- thin rules, hard-edged frames, and restrained depth;
- asymmetric horizontal proof bands;
- project-specific accent colors;
- no red or purple palette and no oversized colored hero slab.

Generated CSV Rescue and Webhook Lab images are composition references only. Actual browser screenshots from the completed tools replace them before deployment.

## Non-goals

- Building a multi-user SaaS, backend, database, authentication system, or hosted file processor.
- Claiming fictional work as customer work.
- Showing every DentSignal screen or using DentSignal as the whole portfolio.
- Publishing a long resume, documentation library, blog, testimonial carousel, or public activity feed.
- Exposing private source code or relying on an empty GitHub profile as proof.
- Adding third-party analytics, chat widgets, trackers, or paid services.
