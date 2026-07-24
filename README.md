# Premium Proof Portfolio

A static sales portfolio for bounded software repair work. The public site contains ten HTML pages:

- `index.html` — concise offer, eight proof entries, fixed starting prices, and email contact;
- `csv-rescue.html` — working browser-local CSV parser and safe cleanup tool;
- `webhook-lab.html` — working deterministic webhook validation and retry simulator;
- `case-study-dentsignal.html` — a real interface shown only with synthetic demo data;
- five `case-study-*.html` engineering pages — sanitized, revision-linked DentSignal
  repair evidence for deployment drift, CI/CD, cloud configuration, async
  reliability, and webhook/token hardening;
- `404.html` — small recovery page.

## Truth and privacy boundaries

- CSV Rescue and Webhook Lab are fictional brands labeled `Concept demo`.
- Both tools run entirely in the browser. They make no external request and persist no input.
- DentSignal evidence comes from a local synthetic fixture and is labeled `Real interface. Synthetic demo data.`
- Engineering case studies use the `Historical PR-reported validation` label and
  link only their exact merged DentSignal pull requests.
- The site has no analytics, cookies, contact backend, external JavaScript, public
  GitHub profile link, testimonial, or commercial outcome claim.

## Local verification

```powershell
npm ci
npm run check
npm run test:browser
git diff --check
```

`npm run check` runs 30 unit/static tests, repository proof checks, and JavaScript
syntax checks. The browser smoke uses an installed Chrome channel and verifies
desktop/mobile layout, keyboard navigation, reduced motion, both demo happy/error
paths, CSV download creation, duplicate event detection, retry exhaustion, console
errors, the synthetic DentSignal caption, and all five engineering-case truth
boundaries.

For a local preview:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4173/`.

## Deployment

The intended public repository is `Niyam-Paneru/Niyam-Paneru.github.io` and the intended URL is `https://niyam-paneru.github.io/`. The source branch keeps the manual-only Pages workflow until the verified tree is migrated.

See [MIGRATION.md](MIGRATION.md) for the exact destination procedure. The migration must not create `CNAME`, transfer `dentsignal.me`, or publish temporary/browser artifacts.
