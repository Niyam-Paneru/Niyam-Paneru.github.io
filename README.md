# Premium Proof Portfolio

A static sales portfolio for bounded software repair work. The public site contains five pages:

- `index.html` — concise offer, three proof bands, fixed starting prices, and email contact;
- `csv-rescue.html` — working browser-local CSV parser and safe cleanup tool;
- `webhook-lab.html` — working deterministic webhook validation and retry simulator;
- `case-study-dentsignal.html` — a real interface shown only with synthetic demo data;
- `404.html` — small recovery page.

## Truth and privacy boundaries

- CSV Rescue and Webhook Lab are fictional brands labeled `Concept demo`.
- Both tools run entirely in the browser. They make no external request and persist no input.
- DentSignal evidence comes from a local synthetic fixture and is labeled `Real interface. Synthetic demo data.`
- The site has no analytics, cookies, contact backend, external JavaScript, public GitHub profile link, testimonial, or commercial outcome claim.

## Local verification

```powershell
npm ci
npm run check
npm run test:browser
git diff --check
```

`npm run check` runs 27 unit/static tests, repository proof checks, and JavaScript syntax checks. The browser smoke uses an installed Chrome channel and verifies desktop/mobile layout, keyboard navigation, reduced motion, both demo happy/error paths, CSV download creation, duplicate event detection, retry exhaustion, console errors, and the DentSignal caption.

For a local preview:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4173/`.

## Deployment

The intended public repository is `NiyamPaneru/NiyamPaneru.github.io` and the intended URL is `https://niyampaneru.github.io/`. The source branch keeps the old canonical base and a manual-only Pages workflow until the verified tree is migrated.

See [MIGRATION.md](MIGRATION.md) for the exact destination procedure. The migration must not create `CNAME`, transfer `dentsignal.me`, or publish temporary/browser artifacts.
